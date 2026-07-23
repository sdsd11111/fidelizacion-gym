import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/evolution';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Evolution API Webhook Structure: body.data.key / body.data.message
    const messageData = body?.data;
    if (!messageData || messageData.key?.fromMe) {
      return NextResponse.json({ status: 'ignored' });
    }

    const remoteJid = messageData.key?.remoteJid || '';
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const pushName = messageData.pushName || 'Cliente';
    const textMessage = (
      messageData.message?.conversation ||
      messageData.message?.extendedTextMessage?.text ||
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
      if (qrToken.type === 'MEMBERSHIP') {
        const plans = await prisma.membershipPlan.findMany({
          where: { tenantId, isActive: true },
          orderBy: { price: 'asc' },
        });

        if (plans.length === 0) {
          // Fallback a monto libre si no hay planes creados
          await prisma.chatSession.upsert({
            where: { tenantId_phone: { tenantId, phone } },
            update: {
              step: 'ENTER_AMOUNT',
              flowType: 'MEMBERSHIP',
              pushName,
              data: JSON.stringify({}),
            },
            create: {
              tenantId,
              phone,
              pushName,
              step: 'ENTER_AMOUNT',
              flowType: 'MEMBERSHIP',
              data: JSON.stringify({}),
            },
          });

          await sendWhatsAppMessage(
            phone,
            `¡Hola ${pushName}! 💳 Has iniciado la verificación para: *Pago de Mensualidad del Gimnasio*.\n\nPor favor ingresa el *MONTO PAGADO* (Ejemplo: 120.00):`,
            tenantId
          );
          return NextResponse.json({ status: 'payment_started_fallback' });
        }

        let menuText = `¡Hola ${pushName}! 💳 Bienvenido a la renovación de tu mensualidad.\n\nSelecciona el *PLAN DE MEMBRESÍA* que cancelaste respondiendo con el *NÚMERO*:\n\n`;
        plans.forEach((p, index) => {
          menuText += `*${index + 1}.* ${p.name} — $${Number(p.price).toFixed(2)} (${p.durationDays} días)\n`;
        });

        await prisma.chatSession.upsert({
          where: { tenantId_phone: { tenantId, phone } },
          update: {
            step: 'SELECT_MEMBERSHIP_PLAN',
            flowType: 'MEMBERSHIP',
            pushName,
            data: JSON.stringify({ plans }),
          },
          create: {
            tenantId,
            phone,
            pushName,
            step: 'SELECT_MEMBERSHIP_PLAN',
            flowType: 'MEMBERSHIP',
            data: JSON.stringify({ plans }),
          },
        });

        await sendWhatsAppMessage(phone, menuText, tenantId);
        return NextResponse.json({ status: 'membership_plans_presented' });
      }

      // === FLUJO 3: PAGO DE TIENDA RETAIL (MONTO DIRECTO) ===
      if (qrToken.type === 'RETAIL') {
        await prisma.chatSession.upsert({
          where: { tenantId_phone: { tenantId, phone } },
          update: {
            step: 'ENTER_AMOUNT',
            flowType: 'RETAIL',
            pushName,
            data: JSON.stringify({}),
          },
          create: {
            tenantId,
            phone,
            pushName,
            step: 'ENTER_AMOUNT',
            flowType: 'RETAIL',
            data: JSON.stringify({}),
          },
        });

        await sendWhatsAppMessage(
          phone,
          `¡Hola ${pushName}! 🛍️ Has iniciado la verificación para: *Pago de Tienda Retail*.\n\nPor favor ingresa el *MONTO TOTAL PAGADO* en la tienda (Ejemplo: 45.00):`,
          tenantId
        );
        return NextResponse.json({ status: 'retail_payment_started' });
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
        const crypto = require('crypto');
        const refCode = `MEM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await prisma.payment.create({
          data: {
            tenantId,
            customerName: pushName,
            customerPhone: phone,
            amount: selectedPlan.price,
            type: 'MEMBERSHIP',
            status: 'PENDING_VERIFICATION',
            referenceCode: refCode,
          },
        });

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });

        await sendWhatsAppMessage(
          phone,
          `✅ *Solicitud de Membresía Registrada*\n\n*Plan:* ${selectedPlan.name} (${selectedPlan.durationDays} días)\n*Monto:* $ ${Number(selectedPlan.price).toFixed(2)}\n*Código:* ${refCode}\n*Cliente:* ${pushName}\n\nEl administrador verificará tu pago para activar tu membresía y otorgar la comisión al cliente que te refirió. ¡Gracias! 💪`,
          tenantId
        );

        return NextResponse.json({ status: 'membership_payment_submitted' });
      }

      if (activeSession.step === 'ENTER_AMOUNT') {
        const cleanAmountStr = textMessage.replace('S/', '').replace('s/', '').replace('$', '').trim();
        const amountNum = parseFloat(cleanAmountStr);

        if (isNaN(amountNum) || amountNum <= 0) {
          await sendWhatsAppMessage(phone, `Por favor ingresa un monto válido en números. Ejemplo: *120.00*`, tenantId);
          return NextResponse.json({ status: 'invalid_amount' });
        }

        const crypto = require('crypto');
        const refCode = `MEM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await prisma.payment.create({
          data: {
            tenantId,
            customerName: pushName,
            customerPhone: phone,
            amount: amountNum,
            type: 'MEMBERSHIP',
            status: 'PENDING_VERIFICATION',
            referenceCode: refCode,
          },
        });

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });

        await sendWhatsAppMessage(
          phone,
          `✅ *Solicitud Registrada*\n\n*Tipo:* Mensualidad Gym\n*Monto:* $ ${amountNum.toFixed(2)}\n*Código:* ${refCode}\n*Cliente:* ${pushName}\n\nEl administrador verificará tu transacción. ¡Gracias por tu preferencia!`,
          tenantId
        );

        return NextResponse.json({ status: 'payment_submitted' });
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

        const crypto = require('crypto');
        const refCode = `RET-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        await prisma.payment.create({
          data: {
            tenantId,
            customerName: pushName,
            customerPhone: phone,
            amount: amountNum,
            type: 'RETAIL_STORE',
            status: 'PENDING_VERIFICATION',
            referenceCode: refCode,
          },
        });

        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });

        await sendWhatsAppMessage(
          phone,
          `✅ *Compra en Tienda Registrada*\n\n*Monto Total:* $ ${amountNum.toFixed(2)}\n*Código:* ${refCode}\n*Cliente:* ${pushName}\n\nEl administrador verificará tu compra para acreditar la comisión a tu referidor. ¡Gracias por tu preferencia! 🛍️`,
          tenantId
        );

        return NextResponse.json({ status: 'retail_payment_submitted' });
      }
    }

    // Si llegamos aquí, la sesión tiene un paso desconocido - ignorar silenciosamente
    return NextResponse.json({ status: 'unhandled_step_silent' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error?.message || 'Error processing webhook' }, { status: 500 });
  }
}
