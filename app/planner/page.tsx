import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { PlannerClient } from "@/components/planner/planner-client";

export default async function PlannerPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const [tasks, unplannedTasks, teamMembers, projects] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId,
        status: { notIn: ["ARCHIVED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        subtasks: { select: { id: true, title: true, completed: true } },
      },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
    }),

    prisma.task.findMany({
      where: {
        organizationId,
        dueAt: null,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),

    prisma.project.findMany({
      where: { organizationId },
      select: { id: true, name: true, deadline: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userRoleString: string =
    typeof user.role === "string"
      ? user.role
      : (user.role as any)?.name || "EMPLOYEE";

  return (
    <AppShell
      title="Strategic Planner"
      subtitle="Schedule, balance workload, and timebox tasks across your team."
      userRole={userRoleString}
    >
      <PlannerClient
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        unplannedTasks={JSON.parse(JSON.stringify(unplannedTasks))}
        teamMembers={JSON.parse(JSON.stringify(teamMembers))}
        projects={JSON.parse(JSON.stringify(projects))}
        currentUserId={user.id}
      />
    </AppShell>
  );
}