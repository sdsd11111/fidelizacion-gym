import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';
import { sendWhatsAppMessage } from '@/lib/evolution';

export async function GET(request: Request) {
  try {
    // Cron trigger verification or authenticated call
    const authHeader = request.headers.get('authorization');
    let tenantIdFilter: string | undefined = undefined;

    if (authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
      // Validate via DAL if called from owner dashboard
      const auth = await verifyTenantAccess();
      tenantIdFilter = auth.tenantId;
    }

    const tenants = await prisma.tenant.findMany({
      where: tenantIdFilter ? { id: tenantIdFilter } : {},
    });

    const results = [];

    for (const tenant of tenants) {
      const now = new Date();
      const inactivityThresholdMs = tenant.inactivityThresholdDays * 24 * 60 * 60 * 1000;
      const inactivityDate = new Date(now.getTime() - inactivityThresholdMs);

      // 1. Inactivity notifications ("Te extrañamos")
      const inactiveCustomers = await prisma.customer.findMany({
        where: {
          tenantId: tenant.id,
          membershipActive: true,
          lastAttendance: { lt: inactivityDate },
        },
      });

      for (const customer of inactiveCustomers) {
        const message = `¡Hola ${customer.name}! 💪 En ${tenant.name} te extrañamos. Tu salud y progreso son lo más importante. ¡Te esperamos esta semana para retomar con todo!`;
        const res = await sendWhatsAppMessage(customer.phone, message);
        await prisma.notificationLog.create({
          data: {
            tenantId: tenant.id,
            phone: customer.phone,
            type: 'INACTIVITY',
            message,
            status: res.success ? 'SENT' : 'FAILED',
          },
        });
      }

      // 2. Membership Expiry notifications
      const nearExpiryDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const expiringCustomers = await prisma.customer.findMany({
        where: {
          tenantId: tenant.id,
          membershipActive: true,
          membershipExpiry: { lte: nearExpiryDate, gte: now },
        },
      });

      for (const customer of expiringCustomers) {
        const message = `Estimado(a) ${customer.name}, te recordamos que tu membresía en ${tenant.name} vence el ${customer.membershipExpiry?.toLocaleDateString('es-ES')}. Acércate a recepción para renovar y mantener tus beneficios sin interrupciones.`;
        const res = await sendWhatsAppMessage(customer.phone, message);
        await prisma.notificationLog.create({
          data: {
            tenantId: tenant.id,
            phone: customer.phone,
            type: 'MEMBERSHIP_EXPIRY',
            message,
            status: res.success ? 'SENT' : 'FAILED',
          },
        });
      }

      // 3. Referral Credit Expiry warning (sent to referrer)
      const warningExpiryThreshold = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days before 12 months end
      const expiringReferrals = await prisma.referral.findMany({
        where: {
          tenantId: tenant.id,
          status: 'PENDING',
          expiresAt: { lte: warningExpiryThreshold, gte: now },
          notifiedNearExpiry: false,
        },
        include: {
          referrer: true,
          referred: true,
        },
      });

      for (const referral of expiringReferrals) {
        const message = `¡Hola ${referral.referrer.name}! Tu oportunidad de ganar comisión por invitar a ${referral.referred.name} está por vencer. Invítalo(a) a inscribirse en ${tenant.name} antes de que expire el plazo.`;
        const res = await sendWhatsAppMessage(referral.referrer.phone, message);

        await prisma.referral.update({
          where: { id: referral.id },
          data: { notifiedNearExpiry: true },
        });

        await prisma.notificationLog.create({
          data: {
            tenantId: tenant.id,
            phone: referral.referrer.phone,
            type: 'REFERRAL_EXPIRY',
            message,
            status: res.success ? 'SENT' : 'FAILED',
          },
        });
      }

      results.push({
        tenantId: tenant.id,
        inactiveNotified: inactiveCustomers.length,
        expiringNotified: expiringCustomers.length,
        referralsNotified: expiringReferrals.length,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error executing notifications cron' }, { status: 500 });
  }
}
