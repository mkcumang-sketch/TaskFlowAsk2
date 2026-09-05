import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { TaskActionButtons } from "@/components/task-action-button";
import { TaskDeleteButton } from "@/components/task-delete-button";
import { requireUser } from "@/lib/auth";
import { getTasksForOrganization } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

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
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col h-[650px]">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Task list</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {tasks.length} tasks
            </span>
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
                No tasks yet. Create your first task.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="group flex-1 cursor-pointer"
                    >
                      <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition">
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {task.status}
                        </span>
                        <span>•</span>
                        <span>
                          {task.dueAt
                            ? `Due ${formatDateTime(task.dueAt)}`
                            : "No due date"}
                        </span>
                        {task.assignees?.[0]?.user?.name && (
                          <>
                            <span>•</span>
                            <span>{task.assignees[0].user.name}</span>
                          </>
                        )}
                      </div>
                    </Link>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                        {task.priority || "MEDIUM"}
                      </span>
                      {isManager && <TaskDeleteButton taskId={task.id} />}
                    </div>
                  </div>

                  {task.description && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Div Comments Section */}
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Comments ({task.comments?.length || 0})
                      </span>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-[11px] font-medium text-blue-600 hover:underline"
                      >
                        Add / View &rarr;
                      </Link>
                    </div>

                    {task.comments && task.comments.length > 0 ? (
                      <p className="text-[11px] text-slate-500 italic line-clamp-1 bg-white p-1.5 rounded border border-slate-100 mt-1">
                        &ldquo;{task.comments[0].content}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">No comments yet.</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 border-t border-slate-100 pt-2">
                    <TaskActionButtons
                      taskId={task.id}
                      currentStatus={task.status}
                      completionProofType={task.completionProofType || "NONE"}
                      isManager={isManager}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}