import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TodayTaskItem } from "@/components/sp/today-task-item";
import { TodayHeaderMetrics } from "@/components/sp/today-header-metrics";

export default async function TodayPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const todayStr = new Date().toISOString().split("T")[0];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch tasks, habits, and active recurring items for today
  const [tasks, habits, habitLogs] = await Promise.all([
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
        assignees: { include: { user: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.habit.findMany({
      where: { userId: user.id, active: true },
    }),

    prisma.habitLog.findMany({
      where: { userId: user.id, date: todayStr },
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
      <div className="mx-auto max-w-5xl space-y-6 font-sans">
        {/* SP Metric Typography Header */}
        <TodayHeaderMetrics
          totalEstimate={totalEstimate}
          totalSpent={totalSpent}
          remainingMinutes={remainingMinutes}
          taskCount={tasks.length}
        />

        {/* Daily Habits Quick Grid */}
        {habits.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sp-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <span className="text-2xs font-extrabold uppercase tracking-widest text-slate-400">
                Daily Habits & Routines
              </span>
              <span className="text-2xs font-bold text-slate-500 font-mono">
                {completedHabitMap.size} / {habits.length} DONE
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {habits.map((habit) => {
                const isDone = completedHabitMap.has(habit.id);
                return (
                  <div
                    key={habit.id}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      isDone
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-slate-50/80 text-slate-700"
                    }`}
                  >
                    <span>{habit.name}</span>
                    <span className="font-mono text-[11px]">{isDone ? "✓" : "○"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Core Task List (Super Productivity Tree Layout) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sp-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="text-2xs font-black uppercase tracking-wider text-slate-500">
                Active Task Backlog
              </span>
              <span className="rounded-md bg-slate-200 px-2 py-0.5 text-2xs font-extrabold font-mono text-slate-700">
                {tasks.length}
              </span>
            </div>

            <div className="flex items-center gap-4 text-2xs font-bold text-slate-400 font-mono uppercase tracking-wider">
              <span>Time Spent / Est.</span>
              <span>Priority</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No tasks scheduled for today. Press <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">Q</kbd> to quick-capture work.
              </div>
            ) : (
              tasks.map((task) => (
                <TodayTaskItem
                  key={task.id}
                  task={task}
                  currentUserId={user.id}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}