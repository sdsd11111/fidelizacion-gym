import webpush from 'web-push';
import { prisma } from './prisma';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@fidelizacion-gym.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  } catch (e) {
    console.error('VAPID setup error:', e);
  }
}

export async function sendOwnerPushNotification(tenantId: string, payload: { title: string; body: string; url?: string }) {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { tenantId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard',
      icon: '/favicon.ico',
    });

    for (const sub of subscriptions) {
      try {
        const keys = JSON.parse(sub.keys);
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error('sendOwnerPushNotification error:', error);
  }
}
