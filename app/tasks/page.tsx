import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { TaskListClient } from "@/components/tasks/task-list-client";

export default async function TasksPage() {
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

  const [tasks, projects, teamMembers, departments] = await Promise.all([
    prisma.task.findMany({
      where: taskWhereClause,
      include: {
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, departmentId: true } },
          },
        },
        subtasks: {
          select: { id: true, title: true, completed: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    }),

    prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    prisma.user.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true, departmentId: true },
      orderBy: { name: "asc" },
    }),

    prisma.department.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell
      title="Task & Kanban Central"
      subtitle={
        isPrivileged
          ? "Manage, triage, prioritize, and allocate tasks across the entire team."
          : "Your assigned deliverables, active SLAs, and submission reviews."
      }
      userRole={user.role}
    >
      <TaskListClient
        initialTasks={tasks}
        projects={projects}
        teamMembers={teamMembers}
        departments={departments}
        currentUserId={user.id}
      />
    </AppShell>
  );
}