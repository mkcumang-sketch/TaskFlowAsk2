import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddAgentForm } from "@/components/add-agent-form";

export default async function TeamPage() {
  const user = await requireUser();

  const members = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId!,
    },
    include: {
      role: true,
      taskAssignments: {
        include: {
          task: {
            select: { status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const isBoss =
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    user.role === "OWNER" ||
    user.role === "MANAGER";

  return (
    <AppShell
      title="Team & Agents"
      subtitle="Manage your team agents and invite new members to the workspace."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Members List */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Active Members</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {members.length} Total
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((member) => {
              const activeTasks = member.taskAssignments.filter(
                (a) => a.task.status !== "COMPLETED" && a.task.status !== "APPROVED"
              ).length;

              return (
                <div key={member.id} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{member.name || "No Name"}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {activeTasks} Active Tasks
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                      {member.role?.name || "MEMBER"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Boss Quick Add Form */}
        {isBoss && (
          <div>
            <AddAgentForm />
          </div>
        )}
      </div>
    </AppShell>
  );
}