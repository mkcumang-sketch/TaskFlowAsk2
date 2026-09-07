import { NextResponse } from "next/server";
import { getSession, hasPermission, isManagementRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canTransition, TaskState } from "@/lib/task-workflow";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { status, proofNote, proofUrl } = await request.json();
    if (typeof status !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
      include: { assignees: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAssignee =
      task.assignees.some((assignee) => assignee.userId === session.id) ||
      task.assigneeEmail === session.email;
    const canManage =
      isManagementRole(session.role) ||
      hasPermission(session.role, "edit_task") ||
      hasPermission(session.role, "approve_task");
    if (!isAssignee && !canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canTransition(task.status as TaskState, status as TaskState)) {
      return NextResponse.json({ error: `Invalid transition from ${task.status} to ${status}` }, { status: 400 });
    }

    // Agar proof attach kiya gaya hai, to description ya comments me record karein
    if (proofNote || proofUrl) {
      await prisma.comment.create({
        data: {
          taskId,
          authorId: session.id,
          content: `Work Proof Submitted:\n${proofUrl ? `Link: ${proofUrl}\n` : ""}${proofNote ? `Note: ${proofNote}` : ""}`,
        },
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "APPROVED" || status === "COMPLETED" ? new Date() : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update task status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}