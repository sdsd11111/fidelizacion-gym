import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';

export async function POST(request: Request) {
  try {
    const { tenantId, user } = await verifyTenantAccess();

    if (user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Solo el OWNER puede actualizar la configuración' }, { status: 403 });
    }

    const { referralCommPct, inactivityThresholdDays } = await request.json();

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        referralCommPct: referralCommPct !== undefined ? Number(referralCommPct) : undefined,
        inactivityThresholdDays: inactivityThresholdDays !== undefined ? Number(inactivityThresholdDays) : undefined,
      },
    });

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error actualizando configuración' }, { status: 500 });
  }
}
