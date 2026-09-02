import { prisma } from "@/lib/prisma";

export async function getDashboardStats(organizationId: string) {
  const tasks = await prisma.task.findMany({
    where: { organizationId },
    select: { status: true, priority: true, dueAt: true },
  });

  const total = tasks.length;
  const inProgress = tasks.filter((task) => task.status === "IN_PROGRESS").length;
  const review = tasks.filter((task) => task.status === "REVIEW").length;
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;
  const overdue = tasks.filter((task) => task.status === "OVERDUE" || (task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "COMPLETED")).length;

  return {
    total,
    inProgress,
    review,
    completed,
    overdue,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
  };
}

export async function getTasksForOrganization(organizationId: string) {
  return prisma.task.findMany({
    where: { organizationId },
    include: {
      creator: true,
      comments: true,
      assignees: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getNotificationsForUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}

export async function getDemoTaskData(organizationId: string) {
  const existingTaskCount = await prisma.task.count({ where: { organizationId } });

  if (existingTaskCount > 0) {
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { organizationId },
  });

  if (!admin) {
    return;
  }

  await prisma.task.createMany({
    data: [
      {
        title: "Vendor research sprint",
        description: "Collect and compare 20 vendor options with pricing and compliance data.",
        status: "ASSIGNED",
        priority: "HIGH",
        organizationId,
        creatorId: admin.id,
        assigneeEmail: admin.email,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        calendarSyncEnabled: true,
        emailEnabled: true,
      },
      {
        title: "Project kickoff review",
        description: "Finalize the onboarding checklist and confirm scope with the client team.",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        organizationId,
        creatorId: admin.id,
        assigneeEmail: admin.email,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        calendarSyncEnabled: false,
        emailEnabled: true,
      },
      {
        title: "Quarterly reporting",
        description: "Submit the department summary and issue tracker to leadership.",
        status: "REVIEW",
        priority: "URGENT",
        organizationId,
        creatorId: admin.id,
        assigneeEmail: admin.email,
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        calendarSyncEnabled: true,
        emailEnabled: true,
      },
    ],
  });
}
