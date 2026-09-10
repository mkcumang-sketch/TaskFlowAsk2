import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const whereClause: any = {
      userId: session.id,
      organizationId: session.organizationId,
      archived: false,
    };

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      broadcast,
      userId,
      title,
      content,
      category = "TASKS",
      priority = "MEDIUM",
      link = "/tasks",
      entityType,
      entityId,
    } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    // 1. Company-wide Urgent Broadcast Alert
    if (broadcast) {
      const orgUsers = await prisma.user.findMany({
        where: { organizationId: session.organizationId },
        select: { id: true },
      });

      if (orgUsers.length === 0) {
        return NextResponse.json({ success: true, count: 0 });
      }

      const broadcastRecords = orgUsers.map((u) => ({
        organizationId: session.organizationId,
        userId: u.id,
        actorId: session.id,
        category,
        priority,
        title: title.trim(),
        content: content.trim(),
        link: link || "/tasks",
        entityType: entityType || "BROADCAST",
        entityId: entityId || null,
      }));

      await prisma.notification.createMany({
        data: broadcastRecords,
      });

      return NextResponse.json({ success: true, count: orgUsers.length }, { status: 201 });
    }

    // 2. Single Targeted Notification
    if (!userId) {
      return NextResponse.json({ error: "Recipient userId is required" }, { status: 400 });
    }

    const singleNotification = await prisma.notification.create({
      data: {
        organizationId: session.organizationId,
        userId,
        actorId: session.id,
        category,
        priority,
        title: title.trim(),
        content: content.trim(),
        link: link || "/tasks",
        entityType: entityType || null,
        entityId: entityId || null,
      },
    });

    return NextResponse.json(singleNotification, { status: 201 });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json({ error: "Failed to dispatch notification" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationId } = body;

    // 1. Mark All Unread as Read
    if (action === "MARK_ALL_READ") {
      await prisma.notification.updateMany({
        where: {
          userId: session.id,
          organizationId: session.organizationId,
          read: false,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }

    // 2. Mark Single Notification as Read
    if (notificationId) {
      const updated = await prisma.notification.update({
        where: {
          id: notificationId,
        },
        data: {
          read: true,
        },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}