import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.organizationId;
    const userId = session.id;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayDateString = startOfToday.toISOString().split("T")[0];

    const [todayCount, inboxCount, urgentCount, habitsTotal, habitsCompletedToday, teamPoolCount] =
      await Promise.all([
        // 1. Today tasks: due today or in progress
        prisma.task.count({
          where: {
            organizationId,
            status: { notIn: ["COMPLETED", "APPROVED"] },
            OR: [
              {
                dueAt: {
                  gte: startOfToday,
                  lte: endOfToday,
                },
              },
              { status: "IN_PROGRESS" },
            ],
          },
        }),

        // 2. Inbox tasks: assigned without projects or unorganized
        prisma.task.count({
          where: {
            organizationId,
            status: "ASSIGNED",
            projectId: null,
          },
        }),

        // 3. Urgent priority (P1)
        prisma.task.count({
          where: {
            organizationId,
            priority: "P1",
            status: { notIn: ["COMPLETED", "APPROVED"] },
          },
        }),

        // 4. Total habits for this user
        prisma.habit.count({
          where: {
            userId,
            organizationId,
          },
        }),

        // 5. Habits completed today
        prisma.habitLog.count({
          where: {
            date: todayDateString,
            completed: true,
            habit: {
              userId,
              organizationId,
            },
          },
        }),

        // 6. Unassigned pool tasks available to claim
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}