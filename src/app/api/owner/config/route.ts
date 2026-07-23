import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';

export async function POST(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const { referralCommPct, storeReferralCommPct, currency, inactivityThresholdDays, whatsappPhone } = await request.json();

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        referralCommPct: Number(referralCommPct),
        storeReferralCommPct: Number(storeReferralCommPct),
        currency: currency === 'PEN' ? 'PEN' : 'USD',
        whatsappPhone: whatsappPhone ? String(whatsappPhone).replace(/\D/g, '') : null,
        inactivityThresholdDays: Number(inactivityThresholdDays),
      },
    });

    return NextResponse.json({ success: true, tenant });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error guardando configuración' }, { status: 500 });
  }
}
