import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';

export async function POST(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const { customerId, amount, description, location } = await request.json();

    if (!customerId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Monto y cliente requeridos' }, { status: 400 });
    }

    const wallet = await prisma.wallet.findFirst({
      where: { customerId, tenantId },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Billetera no encontrada' }, { status: 404 });
    }

    const redeemAmount = Number(amount);
    if (Number(wallet.balance) < redeemAmount) {
      return NextResponse.json({ error: 'Saldo insuficiente para el canje' }, { status: 400 });
    }

    // Process 100% uncapped redemption
    const newBalance = Number(wallet.balance) - redeemAmount;

    await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      }),
      prisma.walletTransaction.create({
        data: {
          tenantId,
          walletId: wallet.id,
          type: 'DEBIT_REDEMPTION',
          amount: redeemAmount,
          description: description || 'Canje de saldo de puntos',
          redeemedAt: new Date(),
          redeemedLocation: location || 'Sucursal Principal',
        },
      }),
    ]);

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error procesando canje' }, { status: 500 });
  }
}
