import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { token, type, customerName, customerPhone, amount } = await request.json();

    if (!token || !type || !customerName || !customerPhone || !amount) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    const qrToken = await prisma.qrToken.findFirst({
      where: { token, type },
    });

    if (!qrToken || qrToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'El código QR ha expirado o no es válido' }, { status: 400 });
    }

    const refCode = `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        tenantId: qrToken.tenantId,
        customerName,
        customerPhone,
        amount: Number(amount),
        type: type === 'MEMBERSHIP' ? 'MEMBERSHIP' : 'RETAIL_STORE',
        status: 'PENDING_VERIFICATION',
        referenceCode: refCode,
      },
    });

    // Ensure customer exists
    let customer = await prisma.customer.findFirst({
      where: { tenantId: qrToken.tenantId, phone: customerPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          tenantId: qrToken.tenantId,
          name: customerName,
          phone: customerPhone,
        },
      });
    }

    return NextResponse.json({
      success: true,
      referenceCode: refCode,
      message: 'Solicitud de pago registrada. Esperando verificación del administrador.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error procesando pago' }, { status: 500 });
  }
}
