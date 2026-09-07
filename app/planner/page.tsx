import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function PlannerPage() {
  const user = await requireOrganizationMembership();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const tasks = await prisma.task.findMany({ where: { organizationId: user.organizationId, dueAt: { gte: start, lt: end }, status: { notIn: ["COMPLETED", "APPROVED"] } }, orderBy: { dueAt: "asc" } });
  const planned = tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
  return <AppShell title="Planner" subtitle="Balance available daily hours against planned estimates." userRole={user.role ?? "EMPLOYEE"}>
    <div className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-slate-500">Available daily hours</p><p className="mt-2 text-3xl font-bold">8h</p><p className="mt-1 text-xs text-slate-500">Across 7 days: 56h</p></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-slate-500">Planned task estimates</p><p className="mt-2 text-3xl font-bold">{Math.round(planned / 60)}h</p><p className="mt-1 text-xs text-slate-500">{tasks.length} tasks scheduled</p></div></div>
    <div className="mt-5 space-y-2">{tasks.map((task) => <div key={task.id} className="flex items-center justify-between rounded-xl border bg-white p-3 text-sm"><span>{task.title}</span><span className="text-xs text-slate-500">{task.dueAt?.toLocaleDateString()} · {task.estimatedMinutes ?? 0}m</span></div>)}</div>
  </AppShell>;
}
