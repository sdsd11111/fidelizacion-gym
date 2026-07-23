import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: branchId } = await params;

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
      include: {
        businessUnit: true,
        tenant: true,
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Sucursal o QR no encontrado' }, { status: 404 });
    }

    const trainers = await prisma.staff.findMany({
      where: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        role: 'TRAINER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      branchName: branch.name,
      businessUnitName: branch.businessUnit.name,
      tenantName: branch.tenant.name,
      trainers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error en servidor' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: branchId } = await params;
    const { trainerId, rating, comment } = await request.json();

    if (!trainerId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Datos de evaluación inválidos' }, { status: 400 });
    }

    const branch = await prisma.branch.findFirst({
      where: { id: branchId, isActive: true },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Sucursal no válida' }, { status: 404 });
    }

    const trainer = await prisma.staff.findFirst({
      where: { id: trainerId, tenantId: branch.tenantId, role: 'TRAINER', isActive: true },
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Entrenador no encontrado' }, { status: 404 });
    }

    const evaluation = await prisma.evaluation.create({
      data: {
        tenantId: branch.tenantId,
        branchId: branch.id,
        trainerId: trainer.id,
        rating: Number(rating),
        comment: comment || null,
        qrSlugId: branchId,
      },
    });

    return NextResponse.json({ success: true, evaluationId: evaluation.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al guardar evaluación' }, { status: 500 });
  }
}
