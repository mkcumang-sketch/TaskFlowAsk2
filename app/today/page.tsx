import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayCockpit } from "@/components/sp/today-cockpit";

export default async function TodayPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const todayStr = new Date().toISOString().split("T")[0];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch today's actionable tasks, habits, and unplanned backlog
  const [tasks, habits, habitLogs, unplannedTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId,
        status: { notIn: ["ARCHIVED"] },
        OR: [
          { dueAt: { gte: startOfDay, lte: endOfDay } },
          { status: "IN_PROGRESS" },
          { status: "REVIEW" },
          { status: "ASSIGNED" },
        ],
      },
      include: {
        subtasks: { orderBy: { createdAt: "asc" } },
        checklistItems: true,
        assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),

    prisma.habit.findMany({
      where: { userId: user.id, active: true },
    }),

    prisma.habitLog.findMany({
      where: { userId: user.id, date: todayStr },
    }),

    // Inbox backlog: unassigned or no due date for instant triage
    prisma.task.findMany({
      where: {
        organizationId,
        dueAt: null,
        status: { in: ["BACKLOG", "ASSIGNED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const completedHabitMap = new Set(
    habitLogs.filter((log) => log.completed).map((log) => log.habitId)
  );

  const totalEstimate = tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);
  const totalSpent = tasks.reduce((sum, t) => sum + (t.actualMinutes || 0), 0);
  const remainingMinutes = Math.max(0, totalEstimate - totalSpent);

  return (
    <AppShell
      title="Today"
      subtitle="Work focus, active time tracking, and scheduled deliverables."
      userRole={user.role}
    >
      <TodayCockpit
        initialTasks={tasks}
        unplannedTasks={unplannedTasks}
        habits={habits}
        completedHabitIds={Array.from(completedHabitMap)}
        currentUserId={user.id}
        metrics={{
          totalEstimate,
          totalSpent,
          remainingMinutes,
        }}
      />
    </AppShell>
  );
}