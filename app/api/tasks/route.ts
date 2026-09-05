import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";
import { sendTaskNotificationEmail } from "@/lib/email-service";
import { syncTaskToGoogleCalendar } from "@/lib/calendar-sync";
import { sendPushNotificationToUser } from "@/lib/push-service";

export async function GET() {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = session.organizationId;

  const tasks = await prisma.task.findMany({
    where: { organizationId },
    include: {
      creator: true,
      assignees: { include: { user: true } },
      comments: true,
      checklistItems: true,
      subtasks: true,
      taskTags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Robust Role & Permission check
  const normalizedRole = (session.role || "EMPLOYEE").toUpperCase();
  const isManagerOrAdmin =
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "OWNER" ||
    normalizedRole === "MANAGER";

  if (!isManagerOrAdmin && !hasPermission(session.role, "create_task")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = session.organizationId;
  const rawBody = await request.json();

  // Validate payload (with fallback for custom P1-P5 priorities)
  const parsed = taskSchema.safeParse(rawBody);
  const payload = parsed.success ? parsed.data : rawBody;

  if (!payload.title || !payload.title.trim()) {
    return NextResponse.json(
      { error: "Task title is required" },
      { status: 400 }
    );
  }

  const effectiveStatus = payload.status ?? payload.taskStatus ?? "ASSIGNED";
  const effectivePriority = payload.priority ?? "P2";

  const assigneeEmails = Array.from(
    new Set(
      [...(payload.assigneeEmails ?? []), ...(payload.assigneeEmail ? [payload.assigneeEmail] : [])].filter(Boolean)
    )
  );

  const assigneeUsers = assigneeEmails.length
    ? await prisma.user.findMany({
        where: {
          organizationId,
          email: { in: assigneeEmails },
        },
      })
    : [];

  const task = await prisma.task.create({
    data: {
      title: payload.title.trim(),
      description: payload.description || "",
      status: effectiveStatus,
      priority: effectivePriority,
      organizationId,
      creatorId: session.id,
      assigneeEmail: assigneeUsers[0]?.email || assigneeEmails[0] || null,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      startAt: payload.startAt ? new Date(payload.startAt) : null,
      estimatedMinutes: payload.estimatedMinutes ?? 60,
      recurrence: payload.recurrence && payload.recurrence !== "NONE" ? payload.recurrence : null,
      completionProofType:
        payload.completionProofType && payload.completionProofType !== "NONE"
          ? payload.completionProofType
          : null,
      approvalRequired: payload.approvalRequired ?? false,
      calendarSyncEnabled: payload.calendarSyncEnabled ?? false,
      emailEnabled: payload.emailEnabled ?? true,
      departmentId: payload.departmentId ?? null,
      teamId: payload.teamId ?? null,
      projectId: payload.projectId ?? null,
      assignees: {
        create: assigneeUsers.map((user) => ({ userId: user.id })),
      },
      checklistItems: {
        create: (payload.checklist ?? []).map((item: any) => ({ text: item.text || item })),
      },
      subtasks: {
        create: (payload.subtasks ?? []).map((subtask: any) => ({
          title: subtask.title,
          description: subtask.description || null,
        })),
      },
    },
    include: {
      creator: true,
      assignees: { include: { user: true } },
      comments: true,
      checklistItems: true,
      subtasks: true,
    },
  });

  if ((payload.tags ?? []).length > 0) {
    const createdTags = await Promise.all(
      (payload.tags ?? []).map(async (tagName: string) =>
        prisma.tag.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: tagName,
            },
          },
          update: {},
          create: {
            organizationId,
            name: tagName,
          },
        })
      )
    );

    await prisma.taskTag.createMany({
      data: createdTags.map((tag) => ({ taskId: task.id, tagId: tag.id })),
    });
  }

  if ((payload.dependencies ?? []).length > 0) {
    const dependencyTasks = await prisma.task.findMany({
      where: {
        id: { in: payload.dependencies },
        organizationId,
      },
      select: { id: true },
    });

    await prisma.taskDependency.createMany({
      data: dependencyTasks.map((dependencyTask) => ({
        taskId: task.id,
        dependsOnId: dependencyTask.id,
      })),
    });
  }

  for (const assignee of assigneeUsers) {
    // In-app Notification
    await prisma.notification.create({
      data: {
        type: "TASK_ASSIGNED",
        content: `Task assigned: ${task.title}`,
        userId: assignee.id,
        taskId: task.id,
        organizationId,
        link: `/tasks/${task.id}`,
      },
    });

    // Audit Log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        taskId: task.id,
        action: "TASK_ASSIGNED",
        details: `Assigned to ${assignee.name || assignee.email}`,
      },
    });

    // Email Dispatch
    if (task.emailEnabled && assignee.email) {
      sendTaskNotificationEmail({
        to: assignee.email,
        recipientName: assignee.name || "Team Member",
        taskTitle: task.title,
        taskId: task.id,
        priority: task.priority,
        dueAt: task.dueAt,
        actorName: session.name || "Manager",
        type: "TASK_ASSIGNED",
      }).catch((err) => console.error("Async assignment email error:", err));
    }

    // Google Calendar Sync
    if (task.calendarSyncEnabled) {
      syncTaskToGoogleCalendar({
        taskId: task.id,
        userId: assignee.id,
      }).catch((err) => console.error("Async calendar sync error:", err));
    }

    // Web / Mobile Push Notification
    sendPushNotificationToUser(assignee.id, {
      title: `New Task: ${task.title}`,
      body: `Priority: ${task.priority} | Due: ${task.dueAt ? new Date(task.dueAt).toLocaleDateString() : "No deadline"}`,
      url: `/tasks/${task.id}`,
    }).catch((err) => console.error("Async push error:", err));
  }

  await prisma.activityLog.create({
    data: {
      userId: session.id,
      taskId: task.id,
      action: "TASK_CREATED",
      details: `Task created with status ${effectiveStatus}, priority ${effectivePriority}`,
    },
  });

  return NextResponse.json(task, { status: 201 });
}