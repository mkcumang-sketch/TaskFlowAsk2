import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const warningWindow = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const upcomingTasks = await prisma.task.findMany({
    where: {
      status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
      dueAt: {
        gte: now,
        lte: warningWindow,
      },
    },
    include: {
      assignees: true,
    },
  });

  let remindersCreated = 0;

  for (const task of upcomingTasks) {
    for (const assignee of task.assignees) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          taskId: task.id,
          userId: assignee.userId,
          type: "REMINDER",
        },
      });

      if (!existingNotification) {
        await prisma.notification.create({
          data: {
            userId: assignee.userId,
            organizationId: task.organizationId,
            taskId: task.id,
            content: `Upcoming deadline: "${task.title}" is due in less than 4 hours.`,
            type: "REMINDER",
            link: `/tasks/${task.id}`,
          },
        });
        remindersCreated++;
      }
    }
  }

  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "WAITING"] },
      dueAt: {
        lt: now,
      },
    },
  });

  let tasksEscalated = 0;

  for (const task of overdueTasks) {
    await prisma.$transaction([
      prisma.task.update({
        where: { id: task.id },
        data: {
          status: "OVERDUE",
        },
      }),
      prisma.activityLog.create({
        data: {
          taskId: task.id,
          action: "TASK_ESCALATED_OVERDUE",
          details: `Task escalated. Original due date: ${task.dueAt?.toISOString() || "N/A"}`,
        },
      }),
      ...(task.creatorId
        ? [
            prisma.notification.create({
              data: {
                userId: task.creatorId,
                organizationId: task.organizationId,
                taskId: task.id,
                content: `Escalation: Task "${task.title}" has crossed its deadline.`,
                type: "ESCALATION",
                link: `/tasks/${task.id}`,
              },
            }),
          ]
        : []),
    ]);
    tasksEscalated++;
  }

  return NextResponse.json({
    success: true,
    remindersCreated,
    tasksEscalated,
    checkedAt: now.toISOString(),
  });
}