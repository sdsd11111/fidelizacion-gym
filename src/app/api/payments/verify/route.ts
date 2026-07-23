import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';

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

    // If membership payment approved, update customer membership state & add referral rewards if any
    if (action === 'APPROVE' && payment.type === 'MEMBERSHIP') {
      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone: payment.customerPhone },
      });

      if (customer) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            membershipActive: true,
            membershipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Activate referral if pending
        const referral = await prisma.referral.findFirst({
          where: { tenantId, referredId: customer.id, status: 'PENDING' },
        });

        if (referral) {
          const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
          const commPct = Number(tenant?.referralCommPct || 10);
          const commissionAmount = (Number(payment.amount) * commPct) / 100;

          await prisma.referral.update({
            where: { id: referral.id },
            data: { status: 'ACTIVATED', activatedAt: new Date() },
          });

          // Add commission to referrer wallet
          let referrerWallet = await prisma.wallet.findFirst({
            where: { tenantId, customerId: referral.referrerId },
          });

          if (!referrerWallet) {
            referrerWallet = await prisma.wallet.create({
              data: { tenantId, customerId: referral.referrerId, balance: 0 },
            });
          }

          const newBal = Number(referrerWallet.balance) + commissionAmount;
          await prisma.wallet.update({
            where: { id: referrerWallet.id },
            data: { balance: newBal },
          });

          await prisma.walletTransaction.create({
            data: {
              tenantId,
              walletId: referrerWallet.id,
              type: 'CREDIT_COMMISSION',
              amount: commissionAmount,
              description: `Comisión (${commPct}%) por primera compra/mensualidad de ${customer.name}`,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error verificando pago' }, { status: 500 });
  }
}
