import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, dueAt, startAt, estimatedMinutes, assigneeId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    // Verify task belongs to authenticated organization
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (dueAt !== undefined) updateData.dueAt = dueAt ? new Date(dueAt) : null;
    if (startAt !== undefined) updateData.startAt = startAt ? new Date(startAt) : null;
    if (estimatedMinutes !== undefined) updateData.estimatedMinutes = Number(estimatedMinutes);

    // If moved to a scheduled date, ensure status is at least ASSIGNED
    if (dueAt && existingTask.status === "DRAFT") {
      updateData.status = "ASSIGNED";
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    // Handle assignee update if requested
    if (assigneeId) {
      await prisma.taskAssignee.deleteMany({ where: { taskId } });
      await prisma.taskAssignee.create({
        data: { taskId, userId: assigneeId },
      });
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Planner scheduling error:", error);
    return NextResponse.json({ error: "Failed to reschedule task" }, { status: 500 });
  }
}