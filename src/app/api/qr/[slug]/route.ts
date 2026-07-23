import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Look for dynamic QR Token (evaluation_xxx, membership_xxx, retail_xxx)
    const qrToken = await prisma.qrToken.findFirst({
      where: { token: slug },
      include: { tenant: true },
    });

    if (qrToken) {
      return NextResponse.json({
        success: true,
        token: qrToken.token,
        type: qrToken.type,
        tenantName: qrToken.tenant.name,
        whatsappPhone: qrToken.tenant.whatsappPhone || null,
      });
    }

    // 2. Fallback check for branch slug if legacy
    const branch = await prisma.branch.findFirst({
      where: { id: slug, isActive: true },
      include: { tenant: true },
    });

    if (branch) {
      return NextResponse.json({
        success: true,
        token: slug,
        type: 'EVALUATION',
        tenantName: branch.tenant.name,
        branchName: branch.name,
        whatsappPhone: branch.tenant.whatsappPhone || null,
      });
    }

    // Default response even if token is demo/expired
    const isMem = slug.startsWith('membership_') || slug.startsWith('MEM-');
    const isRet = slug.startsWith('retail_') || slug.startsWith('RET-');
    return NextResponse.json({
      success: true,
      token: slug,
      type: isMem ? 'MEMBERSHIP' : isRet ? 'RETAIL' : 'EVALUATION',
      tenantName: 'Gimnasio & Retail',
      whatsappPhone: null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error en servidor' }, { status: 500 });
  }
}
