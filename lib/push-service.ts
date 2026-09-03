import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Default public/private VAPID keys (production ke liye .env me override kar sakte ho)
const publicVapidKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

const privateVapidKey =
  process.env.VAPID_PRIVATE_KEY || "eLgP786zV_4tI86LqHw2J47p13o9d7e3-q19V38y00Q";

webpush.setVapidDetails(
  "mailto:support@taskflow.dev",
  publicVapidKey,
  privateVapidKey
);

export async function sendPushNotificationToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  try {
    // DB se user ki registered push subscription fetch karo
    const log = await prisma.activityLog.findFirst({
      where: {
        userId,
        action: "PUSH_SUBSCRIPTION_REGISTERED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!log || !log.details) return;

    const subscription = JSON.parse(log.details);

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/my-day",
      })
    );
  } catch (error) {
    console.error("Push dispatch failed for user:", userId, error);
  }
}