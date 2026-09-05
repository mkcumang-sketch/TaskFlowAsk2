import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;
  const now = new Date();

  // Database se live metrics fetch karo
  const tasks = await prisma.task.findMany({
    where: { organizationId },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "COMPLETED" || t.status === "APPROVED");
  const overdue = tasks.filter(
    (t) =>
      t.status === "OVERDUE" ||
      (t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED" && t.status !== "APPROVED")
  );
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS");
  const inReview = tasks.filter((t) => t.status === "REVIEW");

  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  // Member-wise aggregation
  const memberMap: Record<
    string,
    { name: string; email: string; assigned: number; completed: number; overdue: number }
  > = {};

  for (const t of tasks) {
    for (const a of t.assignees) {
      const u = a.user;
      if (!memberMap[u.id]) {
        memberMap[u.id] = {
          name: u.name || u.email.split("@")[0],
          email: u.email,
          assigned: 0,
          completed: 0,
          overdue: 0,
        };
      }
      memberMap[u.id].assigned++;
      if (t.status === "COMPLETED" || t.status === "APPROVED") memberMap[u.id].completed++;
      if (
        t.status === "OVERDUE" ||
        (t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED" && t.status !== "APPROVED")
      ) {
        memberMap[u.id].overdue++;
      }
    }
  }

  const teamList = Object.values(memberMap);

  return (
    <AppShell
      title="Reports & Analytics"
      subtitle="Comprehensive overview of organizational velocity, workload, and completion health."
      userRole={user.role ?? undefined}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Work Volume</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{total}</p>
            <p className="mt-1 text-xs text-slate-400">Total tasks created</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
            <p className="text-xs font-semibold text-emerald-700">Completion Velocity</p>
            <p className="mt-1 text-3xl font-bold text-emerald-800">{completionRate}%</p>
            <p className="mt-1 text-xs text-emerald-600">{completed.length} tasks closed</p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm">
            <p className="text-xs font-semibold text-red-700">Overdue SLA Breaches</p>
            <p className="mt-1 text-3xl font-bold text-red-800">{overdue.length}</p>
            <p className="mt-1 text-xs text-red-600">Tasks requiring escalation</p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-5 shadow-sm">
            <p className="text-xs font-semibold text-purple-700">Under Review</p>
            <p className="mt-1 text-3xl font-bold text-purple-800">{inReview.length}</p>
            <p className="mt-1 text-xs text-purple-600">Pending manager sign-off</p>
          </div>
        </div>

        {/* Breakdown Progress Bars */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Pipeline Distribution</h3>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              style={{ width: `${total ? (completed.length / total) * 100 : 0}%` }}
              className="bg-emerald-500"
              title="Completed"
            />
            <div
              style={{ width: `${total ? (inProgress.length / total) * 100 : 0}%` }}
              className="bg-amber-500"
              title="In Progress"
            />
            <div
              style={{ width: `${total ? (inReview.length / total) * 100 : 0}%` }}
              className="bg-purple-500"
              title="Review"
            />
            <div
              style={{ width: `${total ? (overdue.length / total) * 100 : 0}%` }}
              className="bg-red-500"
              title="Overdue"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Completed ({completed.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> In Progress ({inProgress.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Review ({inReview.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Overdue ({overdue.length})
            </span>
          </div>
        </div>

        {/* Team Workload Table */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Individual Team Workload</h3>

          {teamList.length === 0 ? (
            <p className="text-sm text-slate-500">No member activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-400">
                    <th className="pb-3">Member</th>
                    <th className="pb-3">Total Assigned</th>
                    <th className="pb-3">Completed</th>
                    <th className="pb-3">Overdue</th>
                    <th className="pb-3">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamList.map((m, idx) => {
                    const rate = m.assigned > 0 ? Math.round((m.completed / m.assigned) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-900">
                          {m.name}
                          <span className="block text-xs text-slate-400">{m.email}</span>
                        </td>
                        <td className="py-3 text-slate-600">{m.assigned}</td>
                        <td className="py-3 text-emerald-600 font-semibold">{m.completed}</td>
                        <td className="py-3 text-red-600 font-semibold">{m.overdue}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}