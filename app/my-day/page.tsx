import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskActionButtons } from "@/components/task-action-button";
import { PushNotifier } from "@/components/push-notifier";
import { GoogleCalendarButton } from "@/components/google-calendar-button";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { calculateWorkload } from "@/lib/workload";

export default async function MyDayPage() {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();

  // Current employee ke assigned active tasks fetch karo
  const tasks = await prisma.task.findMany({
    where: {
      organizationId: user.organizationId!,
      assignees: {
        some: {
          userId: user.id,
        },
      },
      status: {
        notIn: ["CANCELLED"],
      },
    },
    include: {
      creator: { select: { name: true, email: true } },
      checklistItems: true,
      project: { select: { name: true } },
    },
    orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
  });

  const workload = calculateWorkload(tasks);
  const totalHours = (workload.totalMinutes / 60).toFixed(1);

  return (
    <AppShell
      title="My Day"
      subtitle="Focus on your immediate deliverables, deadlines, and workload."
      userRole={normalizedRole}
    >
      <div className="space-y-6">
        {/* Push Alert and Calendar Sync Top Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <PushNotifier />
          </div>
          <div className="shrink-0">
            <GoogleCalendarButton />
          </div>
        </div>

        {/* Workload Metrics Banner */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-medium text-slate-500">Active Tasks</span>
            <p className="mt-1 text-2xl font-bold text-slate-900">{workload.totalActive}</p>
            <span className="text-[11px] text-slate-400">~{totalHours} hrs estimated</span>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-red-600">Overdue</span>
            <p className="mt-1 text-2xl font-bold text-red-700">{workload.overdueCount}</p>
            <span className="text-[11px] text-red-500">Action required</span>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-amber-600">Due Today</span>
            <p className="mt-1 text-2xl font-bold text-amber-700">{workload.dueTodayCount}</p>
            <span className="text-[11px] text-amber-500">Scheduled for today</span>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-sm">
            <span className="text-xs font-semibold text-purple-600">Pending Review</span>
            <p className="mt-1 text-2xl font-bold text-purple-700">{workload.reviewCount}</p>
            <span className="text-[11px] text-purple-500">Awaiting approval</span>
          </div>
        </div>

        {/* Work Stream + Focus Timer Layout */}
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.55fr]">
          {/* Left Column: Task Stream */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Immediate Work Stream</h2>

            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                You are all caught up! No active tasks assigned to you right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const isOverdue =
                    task.status === "OVERDUE" ||
                    (task.dueAt &&
                      new Date(task.dueAt) < new Date() &&
                      task.status !== "COMPLETED" &&
                      task.status !== "APPROVED");

                  return (
                    <div key={task.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                                isOverdue
                                  ? "bg-red-100 text-red-700"
                                  : task.status === "IN_PROGRESS"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {task.status}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                              {task.priority}
                            </span>
                            {task.project && (
                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                {task.project.name}
                              </span>
                            )}
                          </div>

                          <Link href={`/tasks/${task.id}`}>
                            <h3 className="mt-2 text-sm font-semibold text-slate-900 hover:text-blue-600">
                              {task.title}
                            </h3>
                          </Link>

                          {task.description && (
                            <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span>
                              {task.dueAt ? `Due: ${formatDateTime(task.dueAt)}` : "No deadline"}
                            </span>
                            <span>&bull;</span>
                            <span>Assigned by: {task.creator?.name || "Manager"}</span>
                            {task.checklistItems.length > 0 && (
                              <>
                                <span>&bull;</span>
                                <span>{task.checklistItems.length} checklist items</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action trigger buttons */}
                        <TaskActionButtons
                          taskId={task.id}
                          currentStatus={task.status}
                          completionProofType={task.completionProofType || "NONE"}
                          isManager={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Pomodoro & Focus Zone */}
          <div className="space-y-6">
            <PomodoroTimer />

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">Sprint Strategy</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Single-tasking beats multitasking. Pick the top priority task from the left stream, start a 25-minute sprint, and mark it for review as soon as you finish.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}