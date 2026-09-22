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

    // 1. Recent chat messages where current user is a channel member
    const recentMessages = await prisma.message.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - 15 * 1000) },
        senderId: { not: currentUserId },
        channel: {
          members: { some: { userId: currentUserId } },
        },
      },
      include: {
        sender: { select: { name: true, email: true } },
      },
      take: 3,
    }).catch(() => []);

    // 2. Newly assigned tasks waiting for acceptance
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
    });

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
    });

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
    });

    return NextResponse.json({
      success: true,
      recentMessages,
      pendingAssignedTasks,
      overdueTasks,
      inProgressTasks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Poll error" }, { status: 500 });
  }
}