import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskForm } from "@/components/task-form";
import { requireUser } from "@/lib/auth";
import { getTasksForOrganization } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function TasksPage() {
  const user = await requireUser();
  const tasks = await getTasksForOrganization(user.organizationId!);

  return (
    <AppShell title="Tasks" subtitle="Create, assign, prioritize, and review work across your organization.">
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <TaskForm />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Task list</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{tasks.length} tasks</span>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No tasks yet. Create your first task.</div>
            ) : (
              tasks.map((task) => (
                <Link href={`/tasks/${task.id}`} key={task.id} className="block rounded-2xl border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{task.status} • {task.priority}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-700">{task.priority}</span>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">{task.dueAt ? `Due ${formatDateTime(task.dueAt)}` : "No due date"}</div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
