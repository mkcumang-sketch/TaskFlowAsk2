import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getTasksForOrganization } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function CalendarPage() {
  const user = await requireUser();
  const tasks = await getTasksForOrganization(user.organizationId!);

  return (
    <AppShell title="Calendar" subtitle="Track due dates, recurring work, and scheduling conflicts.">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming deadlines</h2>
          <span className="text-sm text-slate-500">Google Calendar integration ready</span>
        </div>
        <div className="space-y-3">
          {tasks.filter((task) => task.dueAt).slice(0, 6).map((task) => (
            <div key={task.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
              <div>
                <div className="font-semibold text-slate-900">{task.title}</div>
                <div className="text-xs text-slate-500">{task.status}</div>
              </div>
              <div className="text-sm text-slate-700">{formatDate(task.dueAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
