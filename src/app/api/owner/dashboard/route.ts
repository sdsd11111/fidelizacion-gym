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

    // Generate or get dynamic single-use/rotating QR tokens for 3 flows (Short 4-char code)
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour validity

    const tokenTypes = ['EVALUATION', 'MEMBERSHIP', 'RETAIL'];
    const qrTokens: Record<string, string> = {};

    const prefixMap: Record<string, string> = {
      EVALUATION: 'EVAL',
      MEMBERSHIP: 'MEM',
      RETAIL: 'RET',
    };

    for (const type of tokenTypes) {
      const existing = await prisma.qrToken.findFirst({
        where: { tenantId, type, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      });

      if (existing) {
        qrTokens[type] = existing.token;
      } else {
        const shortCode = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars (e.g. A1B2)
        const newTokenStr = `${prefixMap[type]}-${shortCode}`;
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

    // Auto-fetch connected instance number from Evolution API and save to DB if connected
    let connectedPhone: string | null = null;
    try {
      const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
      const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

      const evRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (evRes.ok) {
        const evInstances = await evRes.json();
        const instArray = Array.isArray(evInstances) ? evInstances : [evInstances];
        const activeInst = instArray.find((i: any) => i.name === 'default' || i.instance?.instanceName === 'default') || instArray[0];

        const rawPhone = activeInst?.owner || activeInst?.instance?.ownerName || activeInst?.instance?.ownerJid || activeInst?.number;
        if (rawPhone) {
          connectedPhone = String(rawPhone).replace(/\D/g, '');
          if (connectedPhone && connectedPhone.length >= 8) {
            await prisma.tenant.update({
              where: { id: tenantId },
              data: { whatsappPhone: connectedPhone },
            });
          }
        }
      }
    } catch (evErr) {
      console.error('Error fetching Evolution instance number:', evErr);
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

    // Auto-create missing wallets for any existing customer safely
    const allCustomersList = await prisma.customer.findMany({ where: { tenantId } });
    for (const c of allCustomersList) {
      await prisma.wallet.upsert({
        where: { customerId: c.id },
        update: {},
        create: { tenantId, customerId: c.id, balance: 0 },
      }).catch(() => {});
    }

    const wallets = await prisma.wallet.findMany({
      where: { tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        transactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    const allPayments = await prisma.payment.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const rawCustomers = await prisma.customer.findMany({
      where: { tenantId },
      include: {
        wallets: {
          include: { transactions: { orderBy: { createdAt: 'desc' } } },
        },
        referralsMade: {
          include: { referred: { select: { name: true, phone: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const allCustomers = rawCustomers.map((c) => ({
      ...c,
      payments: allPayments.filter((p) => p.customerPhone === c.phone),
      evaluations: evaluations.filter((e) => e.customerId === c.id),
      referralsGiven: c.referralsMade,
    }));

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
