import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/evolution';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Evolution API Webhook Structure: can be in body.data or root body
    const messageData = body?.data || body;
    const key = messageData?.key || body?.key;

    if (!messageData || key?.fromMe) {
      return NextResponse.json({ status: 'ignored' });
    }

    const remoteJid = key?.remoteJid || messageData?.remoteJid || '';
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const pushName = messageData?.pushName || body?.pushName || 'Cliente';
    
    const messageObj = messageData?.message || body?.message;
    const textMessage = (
      messageObj?.conversation ||
      messageObj?.extendedTextMessage?.text ||
      messageData?.text ||
      ''
    ).trim();

    if (!phone || !textMessage) {
      return NextResponse.json({ status: 'empty_message' });
    }

    // 1. Check if message contains a QR token code (starts a new flow)
    // Matches: EVAL-A1B2, MEM-XXXX, RET-XXXX (new short) or evaluation_xxx, membership_xxx, retail_xxx (legacy)
    const qrMatch = textMessage.match(/(EVAL-[A-F0-9]{4}|MEM-[A-F0-9]{4}|RET-[A-F0-9]{4}|evaluation_[a-f0-9]+|membership_[a-f0-9]+|retail_[a-f0-9]+)/i);

    if (qrMatch) {
      const scannedToken = qrMatch[1];
      const qrToken = await prisma.qrToken.findFirst({
        where: { token: scannedToken },
      });

      if (!qrToken) {
        // Token inválido: NO responde nada (bot solo responde a flujos válidos)
        return NextResponse.json({ status: 'invalid_qr_silent' });
      }

      const tenantId = qrToken.tenantId;

      // Registrar cliente automáticamente con nombre y teléfono de WhatsApp
      let customer = await prisma.customer.findFirst({
        where: { tenantId, phone },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            tenantId,
            name: pushName,
            phone,
          },
        });
      }

      // === FLUJO 1: EVALUACIÓN DE ENTRENADORES ===
      if (qrToken.type === 'EVALUATION') {
        const trainers = await prisma.staff.findMany({
          where: { tenantId, role: 'TRAINER', isActive: true },
          select: { id: true, name: true },
        });

        if (trainers.length === 0) {
          await sendWhatsAppMessage(phone, `¡Hola ${pushName}! En este momento no hay entrenadores registrados para evaluar. Gracias.`, tenantId);
          return NextResponse.json({ status: 'no_trainers' });
        }

        let menuText = `¡Hola ${pushName}! 💪 Bienvenido al sistema de evaluación.\n\n¿Con qué entrenador estuviste entrenando o de quién deseas dejar tu opinión?\n\nResponde con el *NÚMERO*:\n\n`;
        trainers.forEach((t, index) => {
          menuText += `*${index + 1}.* ${t.name}\n`;
        });

        await prisma.chatSession.upsert({
          where: { tenantId_phone: { tenantId, phone } },
          update: {
            step: 'SELECT_TRAINER',
            flowType: 'EVALUATION',
            pushName,
            data: JSON.stringify({ trainers }),
          },
          create: {
            tenantId,
            phone,
            pushName,
            step: 'SELECT_TRAINER',
            flowType: 'EVALUATION',
            data: JSON.stringify({ trainers }),
          },
        });

        await sendWhatsAppMessage(phone, menuText, tenantId);
        return NextResponse.json({ status: 'evaluation_started' });
      }

      // === FLUJO 2: PAGO MENSUALIDAD (MENÚ DE PLANES) ===
      // === FLUJO 2: PAGO DE MENSUALIDAD (REQUIERE APROBACIÓN PREVIA DEL ADMIN) ===
      if (qrToken.type === 'MEMBERSHIP') {
        const crypto = require('crypto');
        const refCode = `MEM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        // Register pending verification request for admin notification
        await prisma.payment.create({
          data: {
            tenantId,
            customerName: pushName,
            customerPhone: phone,
            amount: 0, // Placeholder until plan selected
            type: 'MEMBERSHIP',
            status: 'PENDING_VERIFICATION',
            referenceCode: refCode,
          },
        });

        await prisma.chatSession.upsert({
          where: { tenantId_phone: { tenantId, phone } },
          update: {
            step: 'WAITING_ADMIN_APPROVAL',
            flowType: 'MEMBERSHIP',
            pushName,
            data: JSON.stringify({ refCode }),
          },
          create: {
            tenantId,
            phone,
            pushName,
            step: 'WAITING_ADMIN_APPROVAL',
            flowType: 'MEMBERSHIP',
            data: JSON.stringify({ refCode }),
          },
        });

        await sendWhatsAppMessage(
          phone,
          `¡Hola ${pushName}! ⏳ Hemos notificado a la administración/recepción del gimnasio sobre tu solicitud de *Pago de Mensualidad*.\n\nPor favor aguarda un momento mientras el administrador aprueba tu ingreso para continuar con la selección de tu plan. 💪`,
          tenantId
        );
        return NextResponse.json({ status: 'membership_waiting_admin' });
      }

      // === FLUJO 3: PAGO DE TIENDA RETAIL (REQUIERE APROBACIÓN PREVIA DEL ADMIN) ===
      if (qrToken.type === 'RETAIL') {
        const crypto = require('crypto');
        const refCode = `RET-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await prisma.payment.create({
          data: {
            tenantId,
            customerName: pushName,
            customerPhone: phone,
            amount: 0, // Placeholder until amount entered
            type: 'RETAIL_STORE',
            status: 'PENDING_VERIFICATION',
            referenceCode: refCode,
          },
        });

        await prisma.chatSession.upsert({
          where: { tenantId_phone: { tenantId, phone } },
          update: {
            step: 'WAITING_ADMIN_APPROVAL',
            flowType: 'RETAIL',
            pushName,
            data: JSON.stringify({ refCode }),
          },
          create: {
            tenantId,
            phone,
            pushName,
            step: 'WAITING_ADMIN_APPROVAL',
            flowType: 'RETAIL',
            data: JSON.stringify({ refCode }),
          },
        });

        await sendWhatsAppMessage(
          phone,
          `¡Hola ${pushName}! 🛍️ Hemos notificado a la recepción/administración del gimnasio sobre tu solicitud de *Compra en Tienda Retail*.\n\nPor favor aguarda un momento mientras el administrador aprueba tu solicitud para ingresar el monto a pagar.`,
          tenantId
        );
        return NextResponse.json({ status: 'retail_waiting_admin' });
      }

      // Tipo de QR desconocido - silencio
      return NextResponse.json({ status: 'unknown_qr_type' });
    }

    // 2. Si NO es un código QR, verificar si hay una sesión activa para este teléfono
    const activeSession = await prisma.chatSession.findFirst({
      where: { phone, NOT: { step: 'IDLE' } },
      orderBy: { updatedAt: 'desc' },
    });

    // *** REGLA CLAVE: Si no hay sesión activa, el bot NO responde nada ***
    if (!activeSession) {
      return NextResponse.json({ status: 'no_active_flow_silent' });
    }

    const tenantId = activeSession.tenantId;
    const sessionData = activeSession.data ? JSON.parse(activeSession.data) : {};

    // === PASOS DEL FLUJO 1: EVALUACIÓN ===
    if (activeSession.flowType === 'EVALUATION') {
      // Paso: Seleccionar entrenador
      if (activeSession.step === 'SELECT_TRAINER') {
        const trainers: Array<{ id: string; name: string }> = sessionData.trainers || [];
        const selectionIndex = parseInt(textMessage, 10) - 1;

        if (isNaN(selectionIndex) || selectionIndex < 0 || selectionIndex >= trainers.length) {
          await sendWhatsAppMessage(
            phone,
            `Por favor responde únicamente con un número del *1 al ${trainers.length}* según la lista de entrenadores.`,
            tenantId
          );
          return NextResponse.json({ status: 'invalid_selection' });
        }

        const selectedTrainer = trainers[selectionIndex];
        sessionData.selectedTrainerId = selectedTrainer.id;
        sessionData.selectedTrainerName = selectedTrainer.name;

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'RATING', data: JSON.stringify(sessionData) },
        });

        await sendWhatsAppMessage(
          phone,
          `¿Cómo calificas la atención de *${selectedTrainer.name}*?\n\nResponde con un número:\n⭐ *5* = Excelente\n⭐ *4* = Buena\n⭐ *3* = Regular\n⭐ *2* = Mala\n⭐ *1* = Muy mala`,
          tenantId
        );
        return NextResponse.json({ status: 'trainer_selected' });
      }

      // Paso: Calificación
      if (activeSession.step === 'RATING') {
        const ratingNum = parseInt(textMessage, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
          await sendWhatsAppMessage(phone, `Por favor responde con un número del *1 al 5* para la calificación.`, tenantId);
          return NextResponse.json({ status: 'invalid_rating' });
        }

        sessionData.rating = ratingNum;

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'COMMENT', data: JSON.stringify(sessionData) },
        });

        await sendWhatsAppMessage(
          phone,
          `¡Gracias! Por último, déjanos tu sugerencia, lo bueno, lo malo o cualquier comentario sobre tu entrenamiento.\n\n(Escribe *OMITIR* si no tienes comentarios)`,
          tenantId
        );
        return NextResponse.json({ status: 'rating_saved' });
      }

      // Paso: Comentario y guardar todo
      if (activeSession.step === 'COMMENT') {
        const commentText = textMessage.toLowerCase() === 'omitir' ? null : textMessage;
        const branch = await prisma.branch.findFirst({ where: { tenantId } });

        // Guardar evaluación completa en la base de datos
        await prisma.evaluation.create({
          data: {
            tenantId,
            branchId: branch?.id || 'main_branch',
            trainerId: sessionData.selectedTrainerId,
            rating: sessionData.rating,
            comment: commentText,
            qrSlugId: `wa_${activeSession.phone}`,
          },
        });

        // Cerrar sesión de chat
        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });

        const ratingLabels: Record<number, string> = {
          5: 'Excelente ⭐⭐⭐⭐⭐',
          4: 'Buena ⭐⭐⭐⭐',
          3: 'Regular ⭐⭐⭐',
          2: 'Mala ⭐⭐',
          1: 'Muy mala ⭐',
        };

        await sendWhatsAppMessage(
          phone,
          `¡Muchas gracias ${pushName}! 🙏\n\n*Entrenador:* ${sessionData.selectedTrainerName}\n*Calificación:* ${ratingLabels[sessionData.rating] || sessionData.rating}\n${commentText ? `*Comentario:* ${commentText}` : ''}\n\nTu opinión fue registrada exitosamente. ¡Buen entrenamiento! 💪`,
          tenantId
        );
        return NextResponse.json({ status: 'evaluation_completed' });
      }
    }

    // === PASOS DEL FLUJO 2: PAGO DE MENSUALIDAD ===
    if (activeSession.flowType === 'MEMBERSHIP') {
      if (activeSession.step === 'SELECT_MEMBERSHIP_PLAN') {
        const plans: Array<{ id: string; name: string; price: number; durationDays: number }> = sessionData.plans || [];
        const selectionIndex = parseInt(textMessage, 10) - 1;

        if (isNaN(selectionIndex) || selectionIndex < 0 || selectionIndex >= plans.length) {
          await sendWhatsAppMessage(
            phone,
            `Por favor responde únicamente con un número del *1 al ${plans.length}* según la lista de planes.`,
            tenantId
          );
          return NextResponse.json({ status: 'invalid_plan_selection' });
        }

        const selectedPlan = plans[selectionIndex];
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const currencySymbol = tenant?.currency === 'PEN' ? 'S/' : '$';

        // 1. Activate customer membership
        let customer = await prisma.customer.findFirst({ where: { tenantId, phone } });
        if (customer) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              membershipActive: true,
              membershipExpiry: new Date(Date.now() + selectedPlan.durationDays * 24 * 60 * 60 * 1000),
            },
          });

          // 2. Process referral commission
          const commPct = Number(tenant?.referralCommPct || 10);
          const referral = await prisma.referral.findFirst({
            where: { tenantId, referredId: customer.id },
          });

          if (referral) {
            const commissionAmount = (Number(selectedPlan.price) * commPct) / 100;
            if (referral.status === 'PENDING') {
              await prisma.referral.update({
                where: { id: referral.id },
                data: { status: 'ACTIVATED', activatedAt: new Date() },
              });
            }

            let referrerWallet = await prisma.wallet.findFirst({
              where: { tenantId, customerId: referral.referrerId },
            });
            if (!referrerWallet) {
              referrerWallet = await prisma.wallet.create({
                data: { tenantId, customerId: referral.referrerId, balance: 0 },
              });
            }

            await prisma.wallet.update({
              where: { id: referrerWallet.id },
              data: { balance: Number(referrerWallet.balance) + commissionAmount },
            });

            await prisma.walletTransaction.create({
              data: {
                tenantId,
                walletId: referrerWallet.id,
                type: 'CREDIT_COMMISSION',
                amount: commissionAmount,
                description: `Comisión (${commPct}%) por compra de Mensualidad de ${customer.name}`,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              },
            });

            const referrerCustomer = await prisma.customer.findUnique({ where: { id: referral.referrerId } });
            if (referrerCustomer?.phone) {
              sendWhatsAppMessage(
                referrerCustomer.phone,
                `🎉 ¡Felicidades ${referrerCustomer.name}! Tu referido ${customer.name} renovó su membresía. Has ganado *${currencySymbol} ${commissionAmount.toFixed(2)}* en tu billetera de recompensas.`,
                tenantId
              ).catch(() => {});
            }
          }
        }

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });

        await sendWhatsAppMessage(
          phone,
          `🎉 *¡Membresía Activada Exitosamente!* \n\n*Plan:* ${selectedPlan.name} (${selectedPlan.durationDays} días)\n*Monto:* ${currencySymbol} ${Number(selectedPlan.price).toFixed(2)}\n*Cliente:* ${pushName}\n\nTu membresía se encuentra *ACTIVA*. ¡A entrenar con todo! 💪🏋️‍♂️`,
          tenantId
        );

        return NextResponse.json({ status: 'membership_completed' });
      }
    }

    // === PASOS DEL FLUJO 3: TIENDA RETAIL ===
    if (activeSession.flowType === 'RETAIL') {
      if (activeSession.step === 'ENTER_AMOUNT') {
        const cleanAmountStr = textMessage.replace('S/', '').replace('s/', '').replace('$', '').trim();
        const amountNum = parseFloat(cleanAmountStr);

        if (isNaN(amountNum) || amountNum <= 0) {
          await sendWhatsAppMessage(phone, `Por favor ingresa un monto válido en números. Ejemplo: *45.00*`, tenantId);
          return NextResponse.json({ status: 'invalid_amount' });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const currencySymbol = tenant?.currency === 'PEN' ? 'S/' : '$';

        let customer = await prisma.customer.findFirst({ where: { tenantId, phone } });
        if (customer) {
          const commPct = Number(tenant?.storeReferralCommPct || 5);
          const referral = await prisma.referral.findFirst({
            where: { tenantId, referredId: customer.id },
          });

          if (referral) {
            const commissionAmount = (amountNum * commPct) / 100;
            let referrerWallet = await prisma.wallet.findFirst({
              where: { tenantId, customerId: referral.referrerId },
            });
            if (!referrerWallet) {
              referrerWallet = await prisma.wallet.create({
                data: { tenantId, customerId: referral.referrerId, balance: 0 },
              });
            }

            await prisma.wallet.update({
              where: { id: referrerWallet.id },
              data: { balance: Number(referrerWallet.balance) + commissionAmount },
            });

            await prisma.walletTransaction.create({
              data: {
                tenantId,
                walletId: referrerWallet.id,
                type: 'CREDIT_COMMISSION',
                amount: commissionAmount,
                description: `Comisión (${commPct}%) por compra en Tienda de ${customer.name}`,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              },
            });

            const referrerCustomer = await prisma.customer.findUnique({ where: { id: referral.referrerId } });
            if (referrerCustomer?.phone) {
              sendWhatsAppMessage(
                referrerCustomer.phone,
                `🎉 ¡Felicidades ${referrerCustomer.name}! Tu referido ${customer.name} realizó una compra en tienda. Has ganado *${currencySymbol} ${commissionAmount.toFixed(2)}* en tu billetera.`,
                tenantId
              ).catch(() => {});
            }
          }
        }

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });

        await sendWhatsAppMessage(
          phone,
          `🛍️ *¡Compra Registrada Exitosamente!*\n\n*Monto Total:* ${currencySymbol} ${amountNum.toFixed(2)}\n*Cliente:* ${pushName}\n\n¡Gracias por tu compra y preferencia! ✨`,
          tenantId
        );

        return NextResponse.json({ status: 'retail_completed' });
      }
    }

    // Si llegamos aquí, la sesión tiene un paso desconocido - ignorar silenciosamente
    return NextResponse.json({ status: 'unhandled_step_silent' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error?.message || 'Error processing webhook' }, { status: 500 });
  }
}
