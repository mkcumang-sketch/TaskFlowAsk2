import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(context.params);
    const taskId = resolvedParams?.id;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const body = await request.json();

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {};

    if (body.status !== undefined) {
      updatePayload.status = body.status;
      if (body.status === "COMPLETED" || body.status === "APPROVED") {
        updatePayload.completedAt = new Date();
      } else {
        updatePayload.completedAt = null;
      }
      if (body.status === "IN_PROGRESS" && !existingTask.startAt) {
        updatePayload.startAt = new Date();
      }
    }

    if (body.priority !== undefined) updatePayload.priority = body.priority;
    if (body.title !== undefined) updatePayload.title = body.title.trim();
    if (body.description !== undefined) updatePayload.description = body.description;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updatePayload,
    });

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json({ error: "Failed to persist status" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(context.params);
    const taskId = resolvedParams?.id;

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        comments: true,
        attachments: true,
        subtasks: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task, { status: 200 });
  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}