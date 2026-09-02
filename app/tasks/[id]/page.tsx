import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const taskId = (await params).id;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: user.organizationId ?? undefined,
    },
    include: {
      comments: { include: { author: true } },
      assignees: { include: { user: true } },
      creator: true,
    },
  });

  if (!task) {
    return <AppShell title="Task not found">No task exists for this workspace.</AppShell>;
  }

  return (
    <AppShell title={task.title} subtitle={`${task.status} • ${task.priority}`}>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 text-sm text-slate-500">Description</div>
          <p className="text-slate-700">{task.description || "No description added yet."}</p>

          <div className="mt-6">
            <div className="mb-3 text-sm font-medium text-slate-700">Comments</div>
            <div className="space-y-3">
              {(task.comments || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No comments yet.</div>
              ) : (
                task.comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl bg-slate-50 p-3">
                    <div className="font-medium text-slate-900">{comment.author?.name || "User"}</div>
                    <div className="mt-1 text-sm text-slate-600">{comment.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Details</div>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <p><span className="font-medium text-slate-900">Assignee:</span> {task.assignees[0]?.user?.name || "Unassigned"}</p>
              <p><span className="font-medium text-slate-900">Due:</span> {task.dueAt ? formatDateTime(task.dueAt) : "No due date"}</p>
              <p><span className="font-medium text-slate-900">Priority:</span> {task.priority}</p>
              <p><span className="font-medium text-slate-900">Status:</span> {task.status}</p>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
