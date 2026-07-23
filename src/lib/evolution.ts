import { prisma } from './prisma';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://178.238.238.158:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '42a447c1-3d74-4b52-9571-042c174f7621';

export async function sendWhatsAppMessage(toPhone: string, text: string, _tenantId?: string) {
  // Format phone to numeric string with country code (e.g. 519XXXXXXXX)
  const cleanPhone = toPhone.replace(/\D/g, '');
  const instanceName = 'default';

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Evolution API error response:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to dispatch Evolution API WhatsApp message:', error);
    return { success: false, error: error?.message || 'Unknown network error' };
  }
}
