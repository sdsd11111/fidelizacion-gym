import { NextResponse } from 'next/server';
import { verifyTenantAccess } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const auth = await verifyTenantAccess();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { subscription } = await request.json();
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const endpointStr = String(subscription.endpoint);
    const keysStr = JSON.stringify(subscription.keys);

    // Upsert subscription for tenant
    const existing = await prisma.pushSubscription.findFirst({
      where: { tenantId: auth.tenantId, endpoint: endpointStr },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { keys: keysStr },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          tenantId: auth.tenantId,
          endpoint: endpointStr,
          keys: keysStr,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error guardando suscripción push' }, { status: 500 });
  }
}
