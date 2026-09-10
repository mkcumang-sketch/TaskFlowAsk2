import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const now = new Date();

  // Parallel database fetch for tasks, members, departments, and logs
  const [tasks, teamMembers, departments, recentActivity] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId,
        status: { notIn: ["ARCHIVED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
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
        presenceStatus: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
        taskAssignments: {
          include: {
            task: {
              select: {
                id: true,
                status: true,
                priority: true,
                dueAt: true,
                completedAt: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),

    prisma.department.findMany({
      where: { organizationId },
      include: {
        _count: { select: { tasks: true, users: true } },
      },
    }),

    prisma.activityLog.findMany({
      where: { organizationId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        task: { select: { title: true } },
      },
    }),
  ]);

  // Aggregate Real KPI Metrics
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const reviewTasks = tasks.filter((t) => t.status === "REVIEW").length;
  const completedTasks = tasks.filter(
    (t) => t.status === "COMPLETED" || t.status === "APPROVED"
  ).length;

  const overdueTasks = tasks.filter(
    (t) =>
      t.dueAt &&
      new Date(t.dueAt) < now &&
      !["COMPLETED", "APPROVED"].includes(t.status)
  ).length;

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Individual Employee KPI Score Computation
  const employeeKPIs = teamMembers.map((member) => {
    const assigned = member.taskAssignments.map((a) => a.task);
    const total = assigned.length;
    const completed = assigned.filter(
      (t) => t.status === "COMPLETED" || t.status === "APPROVED"
    ).length;
    const overdue = assigned.filter(
      (t) =>
        t.dueAt &&
        new Date(t.dueAt) < now &&
        !["COMPLETED", "APPROVED"].includes(t.status)
    ).length;

    // Score out of 100: baseline 100 - (overdue penalty * 15) + (completion ratio * 40)
    let score = 75;
    if (total > 0) {
      score = Math.min(
        100,
        Math.max(10, Math.round((completed / total) * 60 + 40 - overdue * 15))
      );
    }

    return {
      id: member.id,
      name: member.name || member.email.split("@")[0],
      email: member.email,
      role: member.role?.name || "Employee",
      department: member.department?.name || "Operations",
      presence: member.presenceStatus || "OFFLINE",
      totalTasks: total,
      completedTasks: completed,
      overdueTasks: overdue,
      performanceScore: score,
    };
  });

  const userRoleString: string =
    typeof user.role === "string"
      ? user.role
      : (user.role as any)?.name || "EMPLOYEE";

  return (
    <AppShell
      title="Strategic Command Center"
      subtitle="Executive Intelligence, Real-time Team KPIs, and Rapid Operations."
      userRole={userRoleString}
    >
      <DashboardClient
        metrics={{
          totalTasks,
          inProgressTasks,
          completedTasks,
          reviewTasks,
          overdueTasks,
          completionRate,
        }}
        tasks={JSON.parse(JSON.stringify(tasks))}
        employeeKPIs={employeeKPIs}
        departments={JSON.parse(JSON.stringify(departments))}
        recentActivity={JSON.parse(JSON.stringify(recentActivity))}
        currentUserId={user.id}
        currentUserRole={userRoleString}
      />
    </AppShell>
  );
}