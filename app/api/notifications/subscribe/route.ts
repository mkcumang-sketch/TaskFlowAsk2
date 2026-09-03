import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId: session.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      userId: session.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ success: true });
}