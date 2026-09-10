import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { ScheduleGridClient } from "@/components/schedule/schedule-grid-client";

export default async function SchedulePage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  // Fetch all tasks for the tenant
  const [scheduledTasks, unscheduledTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId,
        startAt: { not: null },
        status: { notIn: ["ARCHIVED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { startAt: "asc" },
    }),

    prisma.task.findMany({
      where: {
        organizationId,
        startAt: null,
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <AppShell
      title="Daily Schedule & Time Grid"
      subtitle="Precision clock scheduling, timeboxing, and capacity planning."
      userRole={user.role}
    >
      <ScheduleGridClient
        initialScheduledTasks={scheduledTasks}
        unscheduledTasks={unscheduledTasks}
        currentUserId={user.id}
      />
    </AppShell>
  );
}