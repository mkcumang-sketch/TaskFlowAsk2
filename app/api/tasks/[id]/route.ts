import { NextResponse } from "next/server";
import { getSession, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncTaskToGoogleCalendar } from "@/lib/calendar-sync";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = (await params).id;
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: session.organizationId,
    },
    include: {
      creator: true,
      comments: { include: { author: true } },
      assignees: { include: { user: true } },
      subtasks: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const taskId = (await params).id;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: session.organizationId,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.creatorId !== session.id && !hasPermission(session.role, "edit_task")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedFields = ["priority", "dueAt", "startAt", "description"] as const;
  if (Object.keys(body).some((key) => !allowedFields.includes(key as (typeof allowedFields)[number]))) {
    return NextResponse.json(
      { error: "Only priority, dueAt, startAt, and description can be updated here. Use transitions for status." },
      { status: 400 },
    );
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      priority: body.priority ?? task.priority,
      dueAt: body.dueAt ? new Date(body.dueAt) : task.dueAt,
      startAt: body.startAt ? new Date(body.startAt) : task.startAt,
      description: body.description ?? task.description,
    },
    include: {
      creator: true,
      assignees: { include: { user: true } },
      comments: true,
    },
  });

  // Calendar sync: Status, startAt, ya dueAt update hone par calendar auto-sync
  if (updatedTask.calendarSyncEnabled && updatedTask.assignees.length > 0) {
    for (const item of updatedTask.assignees) {
      syncTaskToGoogleCalendar({
        taskId: updatedTask.id,
        userId: item.userId,
      }).catch((err) => console.error("Async calendar update failed:", err));
    }
  }

  return NextResponse.json(updatedTask);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();

    if (!session || !session.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskId = (await params).id;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Role check: Creator ya Admin/Manager hi task delete kar sakein
    const userRole = (session.role || "").toUpperCase();
    const canDelete =
      task.creatorId === session.id ||
      userRole === "SUPER_ADMIN" ||
      userRole === "ADMIN" ||
      userRole === "OWNER" ||
      userRole === "MANAGER" ||
      hasPermission(session.role, "delete_task");

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden. You do not have permission to delete this task." }, { status: 403 });
    }

    // MongoDB ke orphan documents cleanup
    await prisma.$transaction([
      prisma.comment.deleteMany({ where: { taskId } }),
      prisma.subtask.deleteMany({ where: { taskId } }),
      prisma.taskAssignee.deleteMany({ where: { taskId } }),
      prisma.taskTag.deleteMany({ where: { taskId } }),
      prisma.reminder.deleteMany({ where: { taskId } }),
      prisma.timeEntry.deleteMany({ where: { taskId } }),
      prisma.activityLog.deleteMany({ where: { taskId } }),
      prisma.calendarEvent.deleteMany({ where: { taskId } }),
      prisma.task.delete({ where: { id: taskId } }),
    ]);

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete Task API Error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}