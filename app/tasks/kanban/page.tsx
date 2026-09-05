import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function KanbanPage() {
  const user = await requireUser();

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: user.organizationId!,
    },
    include: {
      assignees: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    completionProofType: t.completionProofType,
    assignees: t.assignees,
  }));

  return (
    <AppShell
      title="Kanban Board"
      subtitle="Visual workflow management and state transitions."
      userRole={user.role ?? undefined}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Link
              href="/tasks"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              List View
            </Link>
            <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
              Kanban View
            </span>
          </div>

          <Link
            href="/tasks"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            + Create New Task
          </Link>
        </div>

        <KanbanBoard initialTasks={formattedTasks} />
      </div>
    </AppShell>
  );
}