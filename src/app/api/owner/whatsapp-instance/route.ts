import { NextResponse } from 'next/server';
import { verifyTenantAccess } from '@/lib/dal';
import { prisma } from '@/lib/prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

// Set this in Vercel env vars once deployed, e.g. https://tu-dominio.vercel.app/api/webhook/whatsapp
const WEBHOOK_URL = process.env.WEBHOOK_URL || '';

export async function GET(request: Request) {
  try {
    const auth = await verifyTenantAccess();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const instanceName = 'default';

    try {
      // Dynamic host detection for production / Vercel
      let webhookUrl = WEBHOOK_URL;
      if (!webhookUrl) {
        const host = request.headers.get('host') || 'fidelizacion-gym.vercel.app';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        webhookUrl = `${protocol}://${host}/api/webhook/whatsapp`;
      }

      // Auto-set webhook on Evolution API
      fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: ['MESSAGES_UPSERT'],
        }),
      }).catch((e) => console.error('Silent webhook set error:', e));

      const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (response.ok) {
        const data = await response.json();
        const state = data?.instance?.state || 'DISCONNECTED';

        if (state === 'open') {
          // Robust detection: fetch instance details to get connected number
          let connectedPhone: string | null = null;
          try {
            const fetchRes = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
              headers: { apikey: EVOLUTION_API_KEY },
            });
            if (fetchRes.ok) {
              const fetchObj = await fetchRes.json();
              const inst = Array.isArray(fetchObj) ? fetchObj[0] : fetchObj;
              const ownerRaw = inst?.owner || inst?.ownerJid || inst?.instance?.ownerJid || inst?.number || data?.instance?.ownerJid || data?.instance?.number;
              if (ownerRaw) {
                connectedPhone = String(ownerRaw).replace(/\D/g, '');
              }
            }
          } catch (e) {
            console.error('Fetch instance detail error:', e);
          }

          if (connectedPhone && connectedPhone.length >= 8) {
            await prisma.tenant.update({
              where: { id: auth.tenantId },
              data: { whatsappPhone: connectedPhone },
            }).catch(() => {});
          }

          return NextResponse.json({
            state: 'CONNECTED',
            instanceName,
            qrcode: null,
            webhookUrl,
            whatsappPhone: connectedPhone,
          });
        }
      }

      const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });

      if (connectRes.ok) {
        const connectData = await connectRes.json();
        const qrcode = connectData?.base64 || connectData?.code || connectData?.qrcode?.base64 || null;
        return NextResponse.json({
          state: 'DISCONNECTED',
          instanceName,
          qrcode,
          webhookUrl,
        });
      }

      return NextResponse.json({
        state: 'DISCONNECTED',
        instanceName,
        qrcode: null,
        webhookUrl,
      });
    } catch (apiError) {
      console.error('Evolution API reachability error:', apiError);
      return NextResponse.json({
        state: 'DISCONNECTED',
        instanceName,
        qrcode: null,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error de sesión' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyTenantAccess();
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const instanceName = 'default';

    // Use WEBHOOK_URL from env, fallback to dynamic host detection
    let webhookUrl = WEBHOOK_URL;
    if (!webhookUrl) {
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      webhookUrl = `${protocol}://${host}/api/webhook/whatsapp`;
    }

    try {
      // Create instance with webhook
      await fetch(`${EVOLUTION_API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: webhookUrl,
          webhook_by_events: false,
          events: ['MESSAGES_UPSERT'],
        }),
      });

      // Set Webhook on existing instance too
      await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          url: webhookUrl,
          enabled: true,
          events: ['MESSAGES_UPSERT'],
        }),
      });

      // Connect to get QR code
      const connectRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
        headers: { apikey: EVOLUTION_API_KEY },
      });

      let qrcode = null;
      if (connectRes.ok) {
        const connectData = await connectRes.json();
        qrcode = connectData?.base64 || connectData?.code || connectData?.qrcode?.base64 || null;
      }

      return NextResponse.json({
        success: true,
        instanceName,
        qrcode,
        webhookUrl,
      });
    } catch (apiError) {
      return NextResponse.json({
        success: false,
        instanceName,
        qrcode: null,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al conectar' }, { status: 401 });
  }
}
