import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { TaskActionButtons } from "@/components/task-action-button";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { requireUser } from "@/lib/auth";
import { getTasksForOrganization } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

function TaskStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ASSIGNED":
      return (
        <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
          ⏳ Pending Accept
        </span>
      );
    case "ACCEPTED":
      return (
        <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
          ✓ Accepted
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
          ⚡ Working (In Progress)
        </span>
      );
    case "REVIEW":
      return (
        <span className="inline-flex items-center rounded-md border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700">
          📬 Proof Submitted (Review)
        </span>
      );
    case "APPROVED":
    case "COMPLETED":
      return (
        <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          ✓ Approved / Done
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
          ✕ Rework Required
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          {status}
        </span>
      );
  }
}

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await getTasksForOrganization(user.organizationId!);

  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();
  const isManager =
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "OWNER" ||
    normalizedRole === "MANAGER";

  return (
    <AppShell
      title="Tasks"
      subtitle="Create, assign, prioritize, and review work across your organization."
      userRole={normalizedRole}
    >
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr] items-start">
        {/* Left Form */}
        <TaskForm />

        {/* Right Task List with Fixed Height & Scrollbar */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col h-[700px]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Task list</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {tasks.length} tasks
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
                No tasks yet. Create your first task.
              </div>
            ) : (
              tasks.map((task: any) => {
                // Determine if the current user is an assignee
                const isAssignee =
                  task.assignees?.some((a: any) => a.userId === user.id) ||
                  task.assigneeEmail === user.email;

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="group flex-1 cursor-pointer"
                      >
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition text-sm">
                          {task.title}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <TaskStatusBadge status={task.status} />

                          <span>•</span>
                          <span>
                            {task.dueAt
                              ? `Due ${formatDateTime(task.dueAt)}`
                              : "No due date"}
                          </span>

                          {task.assignees?.[0]?.user?.name && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-slate-700">
                                👤 {task.assignees[0].user.name}
                              </span>
                            </>
                          )}
                        </div>
                      </Link>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                          {task.priority || "P2"}
                        </span>
                        {isManager && <TaskDeleteButton taskId={task.id} />}
                      </div>
                    </div>

                    {task.description && (
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Action buttons with proper permission guards */}
                    <div className="mt-3 border-t border-slate-100 pt-2">
                      <TaskActionButtons
                        taskId={task.id}
                        currentStatus={task.status}
                        completionProofType={task.completionProofType || "ANY"}
                        isManager={isManager}
                        isAssignee={isAssignee}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}