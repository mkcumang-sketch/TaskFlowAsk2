import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.organizationId) {
      return NextResponse.json(
        { today: 0, inbox: 0, urgent: 0, habits: 0, teamPool: 0 },
        { status: 200 }
      );
    }

    const organizationId = session.organizationId;
    const userId = session.id;

    // Local Day boundaries
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Format YYYY-MM-DD locally rather than UTC to avoid timezone shift
    const todayDateString = `${startOfToday.getFullYear()}-${String(
      startOfToday.getMonth() + 1
    ).padStart(2, "0")}-${String(startOfToday.getDate()).padStart(2, "0")}`;

    const [
      todayCount,
      inboxCount,
      urgentCount,
      habitsTotal,
      habitsCompletedToday,
      teamPoolCount,
    ] = await Promise.all([
      // 1. Today tasks: due today, assigned or in-progress, excluding completed/archived
      prisma.task.count({
        where: {
          organizationId,
          status: { notIn: ["COMPLETED", "APPROVED", "ARCHIVED"] },
          OR: [
            {
              dueAt: {
                gte: startOfToday,
                lte: endOfToday,
              },
            },
            { status: "IN_PROGRESS" },
            { status: "REVIEW" },
          ],
        },
      }),

      // 2. Inbox Count: Unread notifications + unorganized backlog tasks
      prisma.notification.count({
        where: {
          userId,
          organizationId,
          read: false,
          archived: false,
        },
      }),

      // 3. Urgent priority tasks
      prisma.task.count({
        where: {
          organizationId,
          priority: { in: ["URGENT", "P1"] },
          status: { notIn: ["COMPLETED", "APPROVED", "ARCHIVED"] },
        },
      }),

      // 4. Active habits for this user
      prisma.habit.count({
        where: {
          userId,
          organizationId,
          active: true,
        },
      }),

      // 5. Habits completed today
      prisma.habitLog.count({
        where: {
          userId,
          date: todayDateString,
          completed: true,
        },
      }),

      // 6. Unassigned pool tasks ready to claim
      prisma.task.count({
        where: {
          organizationId,
          status: "ASSIGNED",
          assignees: { none: {} },
          assigneeEmail: null,
        },
      }),
    ]);

    return NextResponse.json({
      today: todayCount,
      inbox: inboxCount,
      urgent: urgentCount,
      habits: Math.max(0, habitsTotal - habitsCompletedToday),
      teamPool: teamPoolCount,
    });
  } catch (error) {
    console.error("Failed to load SP counters:", error);
    // Return empty payload with 200 to prevent layout crashes on background polling
    return NextResponse.json(
      { today: 0, inbox: 0, urgent: 0, habits: 0, teamPool: 0 },
      { status: 200 }
    );
  }
}