import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/components/kanban-board";

export default async function KanbanPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const userRole = (user.role || "").toUpperCase();
  const isPrivileged = ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"].includes(userRole);

  const taskWhereClause: any = {
    organizationId,
    status: { notIn: ["ARCHIVED"] },
  };

  if (!isPrivileged) {
    taskWhereClause.OR = [
      { assignees: { some: { userId: user.id } } },
      { creatorId: user.id },
    ];
  }

  const [tasks, projects, teamMembers] = await Promise.all([
    prisma.task.findMany({
      where: taskWhereClause,
      include: {
        project: { select: { id: true, name: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        subtasks: {
          select: { id: true, title: true, completed: true },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell
      title="Kanban Board"
      subtitle="Visual workflow management, state transitions, and SLA tracking."
      userRole={user.role}
    >
      <KanbanBoard
        initialTasks={tasks as any}
        projects={projects}
        teamMembers={teamMembers}
        currentUserId={user.id}
      />
    </AppShell>
  );
}