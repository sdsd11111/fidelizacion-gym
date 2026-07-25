import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: List all tenants with staff details & tab permissions
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        staff: {
          where: { role: 'OWNER' },
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: {
          select: { customers: true, wallets: true, evaluations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tenants });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al listar tenants' }, { status: 500 });
  }
}

// POST: Create a new tenant with owner credentials
export async function POST(request: Request) {
  try {
    const { name, username, password } = await request.json();

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'El nombre del gimnasio, usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const existingTenant = await prisma.tenant.findFirst({
      where: { OR: [{ slug: cleanSlug }, { name }] },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Ya existe un gimnasio con este nombre o slug' },
        { status: 400 }
      );
    }

    const existingStaff = await prisma.staff.findUnique({
      where: { email: username },
    });

    if (existingStaff) {
      return NextResponse.json(
        { error: `El nombre de usuario "${username}" ya está registrado` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Tenant and Owner Staff in atomic transaction
    const newTenant = await prisma.tenant.create({
      data: {
        name,
        slug: cleanSlug,
        isActive: true,
        showOverviewTab: true,
        showEvaluationsTab: true,
        showWalletTab: true,
        showConfigTab: true,
        staff: {
          create: {
            name: `${name} Admin`,
            email: username,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: {
        staff: true,
      },
    });

    return NextResponse.json({ success: true, tenant: newTenant });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al crear cliente' }, { status: 500 });
  }
}

// PUT: Update tenant active status or tab visibility toggles
export async function PUT(request: Request) {
  try {
    const { tenantId, isActive, showOverviewTab, showEvaluationsTab, showWalletTab, showConfigTab, password } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 });
    }

    const updateData: any = {};

    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof showOverviewTab === 'boolean') updateData.showOverviewTab = showOverviewTab;
    if (typeof showEvaluationsTab === 'boolean') updateData.showEvaluationsTab = showEvaluationsTab;
    if (typeof showWalletTab === 'boolean') updateData.showWalletTab = showWalletTab;
    if (typeof showConfigTab === 'boolean') updateData.showConfigTab = showConfigTab;

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    // Optionally update password for owner if provided
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.staff.updateMany({
        where: { tenantId, role: 'OWNER' },
        data: { passwordHash },
      });
    }

    return NextResponse.json({ success: true, tenant: updatedTenant });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al actualizar tenant' }, { status: 500 });
  }
}
