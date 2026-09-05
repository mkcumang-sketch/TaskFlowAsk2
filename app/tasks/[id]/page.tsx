import { AppShell } from "@/components/app-shell";
import { TaskTimer } from "@/components/task-timer";
import { TaskSubtasksSection, TaskCommentsSection } from "@/components/task-detail-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();
  const taskId = (await params).id;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: user.organizationId ?? undefined,
    },
    include: {
      comments: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
      assignees: { include: { user: true } },
      creator: true,
      subtasks: { orderBy: { createdAt: "asc" } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return (
      <AppShell title="Task not found" userRole={normalizedRole}>
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No task exists for this workspace.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={task.title}
      subtitle={`${task.status} • Priority: ${task.priority}`}
      userRole={normalizedRole}
    >
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        {/* Main Content Area */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
            Description
          </div>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {task.description || "No description added yet."}
          </p>

          {/* Interactive Subtasks */}
          <TaskSubtasksSection taskId={task.id} initialSubtasks={task.subtasks} />

          {/* Comments & Updates */}
          <TaskCommentsSection taskId={task.id} initialComments={task.comments} />
        </div>

        {/* Sidebar Controls */}
        <aside className="space-y-6">
          {/* Phase 4 Live Time Tracker Widget */}
          <TaskTimer taskId={task.id} initialActualMinutes={task.actualMinutes || 0} />

          {/* Meta Information */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
              Details
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Project</span>
                <span className="font-semibold text-slate-900">
                  {task.project?.name || "None"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Assignee</span>
                <span className="font-semibold text-slate-900">
                  {task.assignees[0]?.user?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Due Date</span>
                <span className="font-semibold text-slate-900">
                  {task.dueAt ? formatDateTime(task.dueAt) : "No due date"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Priority</span>
                <span className="font-semibold text-slate-900">{task.priority}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-slate-900">{task.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimate</span>
                <span className="font-semibold text-slate-900">
                  {task.estimatedMinutes ? `${task.estimatedMinutes}m` : "Not set"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}