import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';

export async function GET(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const plans = await prisma.membershipPlan.findMany({
      where: { tenantId, isActive: true },
      orderBy: { price: 'asc' },
    });
    return NextResponse.json({ plans });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al obtener planes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const { name, durationDays, price } = await request.json();

    if (!name || !durationDays || !price) {
      return NextResponse.json({ error: 'Nombre, duración y precio son requeridos' }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.create({
      data: {
        tenantId,
        name,
        durationDays: Number(durationDays),
        price: Number(price),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al crear plan' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');

    if (!planId) {
      return NextResponse.json({ error: 'ID de plan requerido' }, { status: 400 });
    }

    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, tenantId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
    }

    await prisma.membershipPlan.update({
      where: { id: plan.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al deshabilitar plan' }, { status: 500 });
  }
}
