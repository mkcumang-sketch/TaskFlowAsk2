import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getDashboardStats, getTasksForOrganization } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const stats = await getDashboardStats(user.organizationId!);
  const tasks = await getTasksForOrganization(user.organizationId!);

  return (
    <AppShell title="Dashboard" subtitle="Operational overview across your organization.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total tasks" value={String(stats.total)} tone="slate" />
        <StatCard label="In progress" value={String(stats.inProgress)} tone="blue" />
        <StatCard label="Completed" value={String(stats.completed)} tone="green" />
        <StatCard label="Review" value={String(stats.review)} tone="amber" />
        <StatCard label="Overdue" value={String(stats.overdue)} tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent tasks</h2>
            <Link href="/tasks" className="text-sm font-medium text-slate-700 hover:text-slate-900">View all</Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-200 p-3">
                <div>
                  <Link href={`/tasks/${task.id}`} className="font-semibold text-slate-900 hover:text-slate-600">{task.title}</Link>
                  <div className="mt-1 text-xs text-slate-500">{task.status} • {task.priority}</div>
                </div>
                <span className="text-xs text-slate-500">{task.dueAt ? formatDateTime(task.dueAt) : "No deadline"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">At a glance</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-slate-500">Completion rate</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{stats.completionRate}%</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-slate-500">Team workload</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">82%</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-slate-500">Calendar sync</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">4 active</div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "slate" | "blue" | "green" | "amber" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-900",
    blue: "bg-blue-100 text-blue-900",
    green: "bg-emerald-100 text-emerald-900",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-rose-100 text-rose-900",
  };

  return (
    <div className={`rounded-3xl p-5 ${tones[tone]}`}>
      <div className="text-sm font-medium opacity-75">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
