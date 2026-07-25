import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encryptSession } from '@/lib/dal';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!staff || !staff.isActive) {
      return NextResponse.json({ error: 'Credenciales inválidas o usuario inactivo' }, { status: 401 });
    }

    if (staff.role !== 'SUPERADMIN' && staff.tenant && staff.tenant.isActive === false) {
      return NextResponse.json({ error: 'Esta cuenta ha sido pausada por la administración. Comunícate con soporte.' }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, staff.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const sessionToken = await encryptSession({
      userId: staff.id,
      tenantId: staff.tenantId,
      role: staff.role,
      email: staff.email,
    });

    const redirectUrl = staff.role === 'SUPERADMIN' ? '/admin' : '/dashboard';

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        tenantName: staff.tenant.name,
      },
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year permanent session
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
