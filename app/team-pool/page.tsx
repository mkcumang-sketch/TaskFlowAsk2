import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { PoolClaimButton } from "@/components/sp/pool-claim-button";

export default async function TeamPoolPage() {
  const user = await requireUser();

  if (!user.organizationId) {
    return (
      <AppShell title="Team Task Pool" subtitle="No organization found" userRole={user.role}>
        <div className="p-8 text-center text-slate-500">
          Please join or create an organization first.
        </div>
      </AppShell>
    );
  }

  const poolTasks = await prisma.task.findMany({
    where: {
      organizationId: user.organizationId,
      assignees: { none: {} },
      status: { notIn: ["COMPLETED", "ARCHIVED"] },
    },
    include: {
      subtasks: true,
    },
    orderBy: { priority: "desc" },
  });

  return (
    <AppShell
      title="Team Task Pool"
      subtitle="Unassigned office tasks available for any team member to pick up."
      userRole={user.role}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {poolTasks.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            No unassigned tasks in the pool. Great job!
          </div>
        ) : (
          poolTasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    {task.priority}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {task.status}
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900">{task.title}</h3>
                {task.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{task.description}</p>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    📋 {task.subtasks.length} subtasks
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-4">
                <PoolClaimButton taskId={task.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}