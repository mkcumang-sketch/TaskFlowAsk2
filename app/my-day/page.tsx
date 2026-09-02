import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getTasksForOrganization } from "@/lib/data";

export default async function MyDayPage() {
  const user = await requireUser();
  const tasks = await getTasksForOrganization(user.organizationId!);

  return (
    <AppShell title="My Day" subtitle="Prioritize work, deadlines, and focus items.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Today</h2>
          <p className="mt-3 text-3xl font-bold text-slate-900">{tasks.filter((task) => task.status !== "COMPLETED").length}</p>
          <p className="mt-2 text-sm text-slate-500">Open items linked to your workday.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">High priority</h2>
          <p className="mt-3 text-3xl font-bold text-slate-900">{tasks.filter((task) => task.priority === "HIGH" || task.priority === "URGENT").length}</p>
          <p className="mt-2 text-sm text-slate-500">Urgent and important work requiring immediate attention.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Estimated workload</h2>
          <p className="mt-3 text-3xl font-bold text-slate-900">7h 20m</p>
          <p className="mt-2 text-sm text-slate-500">Based on assigned tasks and due dates.</p>
        </div>
      </div>
    </AppShell>
  );
}
