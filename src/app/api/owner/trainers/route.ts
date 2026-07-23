import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyTenantAccess } from '@/lib/dal';

export async function GET(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const trainers = await prisma.staff.findMany({
      where: { tenantId, role: 'TRAINER', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ trainers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al obtener entrenadores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const { name, email, phone } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const trainerEmail = email || `trainer_${Date.now()}@gym.com`;

    const trainer = await prisma.staff.create({
      data: {
        tenantId,
        name,
        email: trainerEmail,
        phone: phone || null,
        passwordHash: 'dummy_hash',
        role: 'TRAINER',
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, trainer });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al agregar entrenador' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenantId } = await verifyTenantAccess();
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('id');

    if (!trainerId) {
      return NextResponse.json({ error: 'ID de entrenador requerido' }, { status: 400 });
    }

    // Verify the trainer belongs to this tenant first
    const trainer = await prisma.staff.findFirst({
      where: { id: trainerId, tenantId, role: 'TRAINER' },
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Entrenador no encontrado' }, { status: 404 });
    }

    // Soft delete: set isActive to false
    await prisma.staff.update({
      where: { id: trainer.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al desactivar entrenador' }, { status: 500 });
  }
}
