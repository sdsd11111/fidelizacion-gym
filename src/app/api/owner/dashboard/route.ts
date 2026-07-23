import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedSession } from '@/lib/dal';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();

    if (!session || !session.tenantId || !session.userId) {
      return NextResponse.json({ error: 'No autorizado / Sesión no válida' }, { status: 401 });
    }

    const tenantId = session.tenantId;

    // Check staff validity
    const staffUser = await prisma.staff.findFirst({
      where: {
        id: session.userId,
        tenantId,
        isActive: true,
      },
    });

    if (!staffUser) {
      return NextResponse.json({ error: 'Usuario no activo o no pertenece a este tenant' }, { status: 401 });
    }

    // Generate or get dynamic single-use/rotating QR tokens for 3 flows
    const now = new Date();
    const expiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins validity

    const tokenTypes = ['EVALUATION', 'MEMBERSHIP', 'RETAIL'];
    const qrTokens: Record<string, string> = {};

    for (const type of tokenTypes) {
      const existing = await prisma.qrToken.findFirst({
        where: { tenantId, type, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        qrTokens[type] = existing.token;
      } else {
        const newTokenStr = `${type.toLowerCase()}_${crypto.randomBytes(8).toString('hex')}`;
        const created = await prisma.qrToken.create({
          data: {
            tenantId,
            type,
            token: newTokenStr,
            expiresAt: expiry,
          },
        });
        qrTokens[type] = created.token;
      }
    }

    // Metrics
    const totalCustomers = await prisma.customer.count({
      where: { tenantId },
    });

    const activeMemberships = await prisma.customer.count({
      where: { tenantId, membershipActive: true },
    });

    // Trainers with short summary (name, stars average, review count)
    const trainers = await prisma.staff.findMany({
      where: { tenantId, role: 'TRAINER', isActive: true },
      include: {
        evaluations: {
          select: { rating: true, comment: true, createdAt: true },
        },
        branch: { select: { name: true } },
      },
    });

    const trainerSummaries = trainers.map((t) => {
      const ratings = t.evaluations.map((e) => e.rating);
      const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '5.0';
      return {
        id: t.id,
        name: t.name,
        branchName: t.branch?.name || 'Gimnasio Principal',
        ratingAvg: avg,
        reviewCount: t.evaluations.length,
        recentComment: t.evaluations[0]?.comment || 'Sin comentarios recientes',
      };
    });

    // Pending payments requiring admin verification
    const pendingPayments = await prisma.payment.findMany({
      where: { tenantId, status: 'PENDING_VERIFICATION' },
      orderBy: { createdAt: 'desc' },
    });

    const evaluations = await prisma.evaluation.findMany({
      where: { tenantId },
      include: {
        trainer: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wallets = await prisma.wallet.findMany({
      where: { tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    // All customers with metadata
    const allCustomers = await prisma.customer.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        membershipActive: true,
        membershipExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    return NextResponse.json({
      tenant,
      totalCustomers,
      activeMemberships,
      qrTokens,
      trainerSummaries,
      pendingPayments,
      evaluations,
      wallets,
      allCustomers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error en dashboard' }, { status: 500 });
  }
}
