import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    const currentUserId = (session as any)?.userId || (session as any)?.id;
    const organizationId = session?.organizationId ?? undefined;

    if (!session || !currentUserId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const recentWindow = new Date(now.getTime() - 25 * 1000);

    // 1. In-App Notifications for chats or urgent alerts (Strictly Type Safe)
    const recentNotifications = await prisma.notification.findMany({
      where: {
        userId: currentUserId,
        createdAt: { gte: recentWindow },
      },
      select: {
        id: true,
        title: true,
        content: true,
        link: true,
        category: true,
      },
      take: 4,
    }).catch(() => []);

    // 2. Newly assigned tasks waiting for acceptance (< 1 hour SLA)
    const pendingAssignedTasks = await prisma.task.findMany({
      where: {
        organizationId,
        status: { in: ["ASSIGNED", "DRAFT"] },
        assignees: { some: { userId: currentUserId } },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        createdAt: true,
      },
      take: 5,
    }).catch(() => []);

    // 3. Overdue SLA Tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        organizationId,
        status: "IN_PROGRESS",
        assignees: { some: { userId: currentUserId } },
        dueAt: { lte: now },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueAt: true,
      },
      take: 5,
    }).catch(() => []);

    // 4. Running Active Tasks (for 10-min reminder check)
    const inProgressTasks = await prisma.task.findMany({
      where: {
        organizationId,
        status: "IN_PROGRESS",
        assignees: { some: { userId: currentUserId } },
        dueAt: { gt: now },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueAt: true,
      },
      take: 3,
    }).catch(() => []);

    return NextResponse.json({
      success: true,
      recentNotifications,
      pendingAssignedTasks,
      overdueTasks,
      inProgressTasks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Poll error" }, { status: 500 });
  }
}