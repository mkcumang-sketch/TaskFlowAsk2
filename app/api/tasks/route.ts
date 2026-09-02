import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { organizationId: session.organizationId },
    include: {
      creator: true,
      assignees: { include: { user: true } },
      comments: true,
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

  const body = await request.json();
  const parsed = taskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid task payload" }, { status: 400 });
  }

  const { title, description, assigneeEmail, dueAt, priority, taskStatus, calendarSyncEnabled, emailEnabled } = parsed.data;

  let assigneeUser = null;

  if (assigneeEmail) {
    assigneeUser = await prisma.user.findFirst({
      where: {
        email: assigneeEmail,
        organizationId: session.organizationId,
      },
    });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || "",
      status: taskStatus,
      priority,
      organizationId: session.organizationId,
      creatorId: session.id,
      assigneeEmail: assigneeUser?.email || assigneeEmail || null,
      dueAt: dueAt ? new Date(dueAt) : null,
      calendarSyncEnabled: calendarSyncEnabled || false,
      emailEnabled: emailEnabled ?? true,
      assignees: assigneeUser ? {
        create: { userId: assigneeUser.id },
      } : undefined,
    },
    include: {
      creator: true,
      assignees: { include: { user: true } },
      comments: true,
    },
  });

  if (assigneeUser) {
    await prisma.notification.create({
      data: {
        type: "TASK_ASSIGNED",
        content: `Task assigned: ${title}`,
        userId: assigneeUser.id,
        taskId: task.id,
        organizationId: session.organizationId,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: session.id,
      taskId: task.id,
      action: "TASK_CREATED",
      details: `Task created and assigned to ${assigneeUser?.name || "unassigned"}`,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
