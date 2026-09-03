import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

export async function sendPushNotificationToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  if (!publicVapidKey || !privateVapidKey) {
    console.error("Push notifications are disabled: VAPID keys are not configured.");
    return;
  }

  webpush.setVapidDetails("mailto:support@taskflow.dev", publicVapidKey, privateVapidKey);
  try {
    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || "/my-day",
          }),
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: subscription.id } });
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Push dispatch failed for user:", userId, error);
  }
}