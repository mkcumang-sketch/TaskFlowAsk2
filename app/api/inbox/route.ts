import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "ALL";
  const unreadOnly = searchParams.get("unread") === "true";
  const search = searchParams.get("search")?.trim();

  const where: any = {
    userId: session.id,
    archived: false,
  };

  if (category !== "ALL") {
    where.category = category;
  }
  if (unreadOnly) {
    where.read = false;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const [notifications, unreadCount, categoryCounts] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: session.id, read: false, archived: false },
    }),
    prisma.notification.groupBy({
      by: ["category"],
      where: { userId: session.id, read: false, archived: false },
      _count: { category: true },
    }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
    categoryCounts: Object.fromEntries(
      categoryCounts.map((c) => [c.category, c._count.category])
    ),
  });
}

// Bulk Actions: Mark all as read, archive, pin
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action, ids } = body;

  if (action === "MARK_ALL_READ") {
    await prisma.notification.updateMany({
      where: { userId: session.id, read: false },
      data: { read: true },
    });
  } else if (action === "ARCHIVE" && Array.isArray(ids)) {
    await prisma.notification.updateMany({
      where: { userId: session.id, id: { in: ids } },
      data: { archived: true },
    });
  } else if (action === "TOGGLE_READ" && ids?.[0]) {
    const item = await prisma.notification.findUnique({ where: { id: ids[0] } });
    if (item) {
      await prisma.notification.update({
        where: { id: ids[0] },
        data: { read: !item.read },
      });
    }
  }

  return NextResponse.json({ success: true });
}