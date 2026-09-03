import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json();

  if (!subscription || !subscription.endpoint) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  // Activity log ya user meta me push subscription store karo
  await prisma.activityLog.create({
    data: {
      userId: session.id,
      action: "PUSH_SUBSCRIPTION_REGISTERED",
      details: JSON.stringify(subscription),
    },
  });

  return NextResponse.json({ success: true });
}