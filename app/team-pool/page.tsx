import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PoolClaimButton } from "@/components/pool-claim-button";

export default async function TeamPoolPage() {
  const user = await requireOrganizationMembership();
  const tasks = await prisma.task.findMany({
    where: { organizationId: user.organizationId, status: "ASSIGNED", assigneeEmail: null, assignees: { none: {} } },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    take: 100,
  });
  return <AppShell title="Available Pool" subtitle="Claim unassigned work when you are ready." userRole={user.role ?? "EMPLOYEE"}>
    <div className="space-y-3">{tasks.length === 0 ? <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">No tasks are currently available.</p> : tasks.map((task) => <div key={task.id} className="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"><div><h2 className="font-semibold">{task.title}</h2><p className="text-xs text-slate-500">{task.priority} · {task.dueAt ? new Date(task.dueAt).toLocaleString() : "No deadline"}</p></div><PoolClaimButton taskId={task.id} /></div>)}</div>
  </AppShell>;
}
