import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { TaskActionButtons } from "@/components/task-action-button";
import { requireUser } from "@/lib/auth";
import { getTasksForOrganization } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await getTasksForOrganization(user.organizationId!);

  const isManager =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "OWNER" ||
    user.role === "MANAGER";

  return (
    <AppShell
      title="Tasks"
      subtitle="Create, assign, prioritize, and review work across your organization."
    >
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <TaskForm />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Task list</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
              {tasks.length} tasks
            </span>
          </div>

          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
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
                        {task.completionProofType !== "NONE" && (
                          <>
                            <span>•</span>
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                              Proof: {task.completionProofType}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                      {task.priority}
                    </span>
                  </div>

                  {/* Dynamic Workflow Actions */}
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