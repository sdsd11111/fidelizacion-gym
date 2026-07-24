import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';
import { sendWhatsAppMessage } from '@/lib/evolution';

export async function POST(request: Request) {
  try {
    const { tenantId, user } = await verifyTenantAccess();
    const { paymentId, action } = await request.json(); // action: 'APPROVE' | 'REJECT'

    if (!paymentId || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        verifiedByStaffId: user.id,
      },
    });

    // Send WhatsApp notification to client
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const currencySymbol = tenant?.currency === 'PEN' ? 'S/' : '$';

    if (action === 'APPROVE') {
      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone: payment.customerPhone },
      });

      // Find active chat session for this customer
      const activeSession = await prisma.chatSession.findFirst({
        where: { tenantId, phone: payment.customerPhone },
      });

      if (payment.type === 'MEMBERSHIP') {
        const plans = await prisma.membershipPlan.findMany({
          where: { tenantId, isActive: true },
          orderBy: { price: 'asc' },
        });

        if (plans.length > 0) {
          let menuText = `✅ *¡Solicitud Aprobada por Recepción!* 💪\n\nBienvenido a la renovación de tu mensualidad. Selecciona tu *PLAN DE MEMBRESÍA* respondiendo con el *NÚMERO*:\n\n`;
          plans.forEach((p, index) => {
            menuText += `*${index + 1}.* ${p.name} — ${currencySymbol} ${Number(p.price).toFixed(2)} (${p.durationDays} días)\n`;
          });

          if (activeSession) {
            await prisma.chatSession.update({
              where: { id: activeSession.id },
              data: {
                step: 'SELECT_MEMBERSHIP_PLAN',
                flowType: 'MEMBERSHIP',
                data: JSON.stringify({ plans }),
              },
            });
          }

          sendWhatsAppMessage(payment.customerPhone, menuText, tenantId).catch(() => {});
        } else {
          // Fallback if no plans
          if (activeSession) {
            await prisma.chatSession.update({
              where: { id: activeSession.id },
              data: { step: 'ENTER_AMOUNT', flowType: 'MEMBERSHIP', data: JSON.stringify({}) },
            });
          }
          sendWhatsAppMessage(
            payment.customerPhone,
            `✅ *¡Solicitud Aprobada por Recepción!* 💳 Por favor ingresa el *MONTO PAGADO* (Ejemplo: 120.00):`,
            tenantId
          ).catch(() => {});
        }
      } else if (payment.type === 'RETAIL_STORE') {
        if (activeSession) {
          await prisma.chatSession.update({
            where: { id: activeSession.id },
            data: { step: 'ENTER_AMOUNT', flowType: 'RETAIL', data: JSON.stringify({}) },
          });
        }

        sendWhatsAppMessage(
          payment.customerPhone,
          `✅ *¡Solicitud Aprobada por Recepción!* 🛍️ Por favor ingresa el *MONTO TOTAL PAGADO* en la tienda (Ejemplo: 45.00):`,
          tenantId
        ).catch(() => {});
      }
    } else {
      // Admin rejected request
      const activeSession = await prisma.chatSession.findFirst({
        where: { tenantId, phone: payment.customerPhone },
      });

      if (activeSession) {
        await prisma.chatSession.update({
          where: { id: activeSession.id },
          data: { step: 'IDLE' },
        });
      }

      const messageText = `❌ *Solicitud No Aprobada*\n\nHola ${payment.customerName || 'Cliente'}, tu solicitud no pudo ser aprobada por recepción en este momento. Por favor acércate a caja.`;
      sendWhatsAppMessage(payment.customerPhone, messageText, tenantId).catch(() => {});
    }

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error verificando pago' }, { status: 500 });
  }
}
