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

    // If payment approved (MEMBERSHIP or RETAIL_STORE), process referral rewards
    if (action === 'APPROVE') {
      const customer = await prisma.customer.findFirst({
        where: { tenantId, phone: payment.customerPhone },
      });

      if (customer) {
        if (payment.type === 'MEMBERSHIP') {
          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              membershipActive: true,
              membershipExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
        const commPct = payment.type === 'MEMBERSHIP' 
          ? Number(tenant?.referralCommPct || 10) 
          : Number(tenant?.storeReferralCommPct || 5);

        // Find referral connection
        const referral = await prisma.referral.findFirst({
          where: { tenantId, referredId: customer.id },
        });

        if (referral) {
          const commissionAmount = (Number(payment.amount) * commPct) / 100;
          const currencySymbol = tenant?.currency === 'PEN' ? 'S/' : '$';

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
              description: `Comisión (${commPct}%) por compra de ${payment.type === 'MEMBERSHIP' ? 'Mensualidad' : 'Tienda Retail'} de ${customer.name} (${currencySymbol} ${commissionAmount.toFixed(2)})`,
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
