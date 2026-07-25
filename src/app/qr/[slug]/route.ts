import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    let whatsappPhone: string | null = null;
    let tenantId: string | null = null;

    // 1. Find dynamic QR Token (EVAL-XXXX, MEM-XXXX, RET-XXXX)
    const qrToken = await prisma.qrToken.findFirst({
      where: { token: slug },
      include: { tenant: true },
    });

    if (qrToken) {
      tenantId = qrToken.tenantId;
      whatsappPhone = qrToken.tenant.whatsappPhone;
    } else {
      // 2. Fallback to branch or first active tenant
      const firstTenant = await prisma.tenant.findFirst({
        where: { isActive: true },
      });
      if (firstTenant) {
        tenantId = firstTenant.id;
        whatsappPhone = firstTenant.whatsappPhone;
      }
    }

    // 3. If phone is not in DB, query Evolution API dynamically for the connected instance number
    if (!whatsappPhone) {
      try {
        const evRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          headers: { apikey: EVOLUTION_API_KEY },
        });

        if (evRes.ok) {
          const evInstances = await evRes.json();
          const instArray = Array.isArray(evInstances) ? evInstances : [evInstances];
          const activeInst = instArray.find((i: any) => i.name === 'default' || i.instance?.instanceName === 'default') || instArray[0];

          const ownerRaw = activeInst?.owner || activeInst?.ownerJid || activeInst?.instance?.ownerJid || activeInst?.number;
          if (ownerRaw) {
            whatsappPhone = String(ownerRaw).replace(/\D/g, '');

            // Save dynamically to database for future fast redirects
            if (whatsappPhone && tenantId) {
              await prisma.tenant.update({
                where: { id: tenantId },
                data: { whatsappPhone },
              }).catch(() => {});
            }
          }
        }
      } catch (evErr) {
        console.error('Error fetching dynamic connected phone from Evolution API:', evErr);
      }
    }

    const cleanPhone = whatsappPhone ? whatsappPhone.replace(/\D/g, '') : '';
    const messageText = `Hola este es mi codigo: ${slug}`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    // Direct HTTP 302 Server Redirect to WhatsApp
    return NextResponse.redirect(waUrl, 302);
  } catch (error: any) {
    const fallbackUrl = `https://wa.me/?text=${encodeURIComponent(`Hola este es mi codigo: QR`)}`;
    return NextResponse.redirect(fallbackUrl, 302);
  }
}
