import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, memberCode: true } },
        },
      },
      comments: true,
      checklistItems: true,
      subtasks: true,
      taskTags: { include: { tag: true } },
      project: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
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

  // Role & Permission verification
  const normalizedRole = (session.role || "EMPLOYEE").toUpperCase();
  const isManagerOrAdmin =
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "OWNER" ||
    normalizedRole === "MANAGER";

  if (!isManagerOrAdmin && !hasPermission(session.role, "create_task")) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  const organizationId = session.organizationId;
  const rawBody = await request.json();

  let title = rawBody.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  // Exact SLA Hour Mapping (P1: Urgent, P2: 4h, P3: 8h, P4: 24h, P5: 48h)
  const slaHours: Record<string, number> = {
    P1: 1,
    P2: 4,
    P3: 8,
    P4: 24,
    P5: 48,
  };

  const effectivePriority = rawBody.priority ?? "P3";
  const hours = slaHours[effectivePriority] ?? 8;

  const dueAt = rawBody.dueAt
    ? new Date(rawBody.dueAt)
    : new Date(Date.now() + hours * 60 * 60 * 1000);

  // 1. Resolve Assignee IDs and Emails from Request
  const rawUserIds: string[] = [
    ...(rawBody.assigneeIds ?? []),
    ...(rawBody.assigneeId ? [rawBody.assigneeId] : []),
  ].filter(Boolean);

  const rawEmails: string[] = [
    ...(rawBody.assigneeEmails ?? []),
    ...(rawBody.assigneeEmail ? [rawBody.assigneeEmail] : []),
  ].filter(Boolean);

  // 2. Resolve @Handle / @MemberCode in Quick Capture Title (e.g., "Fix auth header @Umang2390")
  const mentionMatch = title.match(/@([a-zA-Z0-9_-]+)/);
  if (mentionMatch) {
    const handleCode = mentionMatch[1];
    const userByHandle = await prisma.user.findFirst({
      where: {
        organizationId,
        OR: [
          { memberCode: handleCode },
          { email: { startsWith: handleCode.toLowerCase() } },
          { name: { contains: handleCode, mode: "insensitive" } },
        ],
      },
      select: { id: true, email: true },
    });

    if (userByHandle) {
      if (!rawUserIds.includes(userByHandle.id)) {
        rawUserIds.push(userByHandle.id);
      }
      if (userByHandle.email && !rawEmails.includes(userByHandle.email)) {
        rawEmails.push(userByHandle.email);
      }
      title = title.replace(mentionMatch[0], "").trim();
    }
  }

  // 3. Fetch Full Assignee User Details
  let assigneeUsers: Array<{ id: string; name: string | null; email: string }> = [];

  if (rawUserIds.length > 0) {
    assigneeUsers = await prisma.user.findMany({
      where: {
        organizationId,
        id: { in: rawUserIds },
      },
      select: { id: true, name: true, email: true },
    });
  } else if (rawEmails.length > 0) {
    assigneeUsers = await prisma.user.findMany({
      where: {
        organizationId,
        email: { in: rawEmails },
      },
      select: { id: true, name: true, email: true },
    });
  }

  const effectiveStatus = rawBody.status ?? (assigneeUsers.length > 0 ? "ASSIGNED" : "DRAFT");

  // 4. Resolve Project Relation
  let resolvedProjectId = rawBody.projectId ?? null;
  if (!resolvedProjectId && rawBody.projectName) {
    const proj = await prisma.project.findFirst({
      where: { organizationId, name: rawBody.projectName },
    });
    resolvedProjectId = proj?.id ?? null;
  }

  // 5. Resolve Department Relation
  let resolvedDepartmentId = rawBody.departmentId ?? null;
  if (!resolvedDepartmentId && rawBody.departmentName) {
    const dept = await prisma.department.findFirst({
      where: { organizationId, name: rawBody.departmentName },
    });
    resolvedDepartmentId = dept?.id ?? null;
  }

  // 6. Create Task in Database
  const task = await prisma.task.create({
    data: {
      title,
      description: rawBody.description || "",
      status: effectiveStatus,
      priority: effectivePriority,
      organizationId,
      creatorId: session.id,
      assigneeEmail: assigneeUsers[0]?.email || rawEmails[0] || null,
      dueAt,
      startAt: rawBody.startAt ? new Date(rawBody.startAt) : null,
      estimatedMinutes: rawBody.estimatedMinutes ?? hours * 60,
      recurrence: rawBody.recurrence && rawBody.recurrence !== "NONE" ? rawBody.recurrence : null,
      completionProofType:
        rawBody.completionProofType && rawBody.completionProofType !== "NONE"
          ? rawBody.completionProofType
          : null,
      approvalRequired: rawBody.approvalRequired ?? false,
      calendarSyncEnabled: rawBody.calendarSyncEnabled ?? false,
      emailEnabled: rawBody.emailEnabled ?? true,
      departmentId: resolvedDepartmentId,
      teamId: rawBody.teamId ?? null,
      projectId: resolvedProjectId,
      assignees: {
        create: assigneeUsers.map((user) => ({ userId: user.id })),
      },
      checklistItems: {
        create: (rawBody.checklist ?? []).map((item: any) => ({
          text: typeof item === "string" ? item : item.text,
        })),
      },
      subtasks: {
        create: (rawBody.subtasks ?? []).map((subtask: any) => ({
          title: subtask.title,
          description: subtask.description || null,
        })),
      },
    },
    include: {
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, memberCode: true } },
        },
      },
      comments: true,
      checklistItems: true,
      subtasks: true,
      project: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  // 7. Tag Relations
  if ((rawBody.tags ?? []).length > 0) {
    const createdTags = await Promise.all(
      (rawBody.tags ?? []).map(async (tagName: string) =>
        prisma.tag.upsert({
          where: {
            organizationId_name: {
              organizationId,
              name: tagName.trim(),
            },
          },
          update: {},
          create: {
            organizationId,
            name: tagName.trim(),
          },
        })
      )
    );

    await prisma.taskTag.createMany({
      data: createdTags.map((tag) => ({ taskId: task.id, tagId: tag.id })),
    });
  }

  // 8. Dependencies
  if ((rawBody.dependencies ?? []).length > 0) {
    const dependencyTasks = await prisma.task.findMany({
      where: {
        id: { in: rawBody.dependencies },
        organizationId,
      },
      select: { id: true },
    });

    await prisma.taskDependency.createMany({
      data: dependencyTasks.map((dep) => ({
        taskId: task.id,
        dependsOnId: dep.id,
      })),
    });
  }

  // 9. Dispatch In-App Notifications, Audit Logs, Emails, and Calendar Events
  for (const assignee of assigneeUsers) {
    await prisma.notification.create({
      data: {
        type: "TASK_ASSIGNED",
        category: "TASKS",
        priority: effectivePriority === "P1" ? "URGENT" : "HIGH",
        content: `You have been assigned: "${task.title}". SLA: ${hours} hour(s).`,
        userId: assignee.id,
        actorId: session.id,
        taskId: task.id,
        organizationId,
        link: `/tasks/${task.id}`,
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId,
        userId: session.id,
        taskId: task.id,
        action: "TASK_ASSIGNED",
        details: `Assigned to ${assignee.name || assignee.email} with priority ${effectivePriority} (${hours}h SLA)`,
      },
    });

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

    if (task.calendarSyncEnabled) {
      syncTaskToGoogleCalendar({
        taskId: task.id,
        userId: assignee.id,
      }).catch((err) => console.error("Async calendar sync error:", err));
    }

    sendPushNotificationToUser(assignee.id, {
      title: `New Task (${task.priority}): ${task.title}`,
      body: `SLA Window: ${hours}h | Due: ${task.dueAt ? new Date(task.dueAt).toLocaleTimeString() : "Immediate"}`,
      url: `/tasks/${task.id}`,
    }).catch((err) => console.error("Async push error:", err));
  }

  return NextResponse.json(task, { status: 201 });
}