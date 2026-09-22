import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const currentUserId = (session as any)?.userId || (session as any)?.id;

    if (!session || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status === "OFFLINE" ? "OFFLINE" : "ONLINE";

    await prisma.user.update({
      where: { id: currentUserId },
      data: {
        presenceStatus: status,
        lastSeenAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, presenceStatus: status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}