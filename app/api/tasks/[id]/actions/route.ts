import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskState } from "@/lib/task-workflow";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id?: string; taskId?: string }> }
) {
  try {
    const session = await getSession();
    const currentUserId = (session as any)?.userId || (session as any)?.id;

    if (!session || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id || resolvedParams.taskId;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const rawAction = (body.action || body.status || body.nextStatus || "").toUpperCase();
    const feedback = body.feedback || body.comment || body.reason || "";
    const holdReason = body.holdReason || body.preemptionReason || "";

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const userRole = ((session as any)?.role || "").toUpperCase();
    const isManagerOrAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"].includes(userRole);
    const isAssignee = task.assignees.some((a) => a.userId === currentUserId);

    if (!isAssignee && !isManagerOrAdmin) {
      return NextResponse.json(
        { error: "Aap is task ke assigned member nahi hain" },
        { status: 403 }
      );
    }

    let nextState: TaskState = "IN_PROGRESS";
    const now = new Date();
    const updateData: Record<string, any> = {};

    // 1. ACCEPT / START ACTION (Max 3 Tasks & 1h warning)
    if (
      rawAction === "ACCEPT" ||
      rawAction === "ACCEPT_TASK" ||
      rawAction === "START" ||
      rawAction === "START_WORK"
    ) {
      const activeRunningCount = await prisma.task.count({
        where: {
          status: "IN_PROGRESS",
          assignees: { some: { userId: currentUserId } },
          id: { not: taskId },
        },
      });

      if (activeRunningCount >= 3) {
        return NextResponse.json(
          {
            error: "Aap ek samay par maximum 3 active tasks le sakte hain. Pehle kisi running task ko Hold ya Complete karein.",
          },
          { status: 400 }
        );
      }

      nextState = "IN_PROGRESS";
      if (!task.startAt) updateData.startAt = now;
      if (!(task as any).assignedAt) updateData.assignedAt = now;
    }
    // 2. HOLD / CARRY FORWARD (Reason Mandatory)
    else if (
      rawAction === "HOLD" ||
      rawAction === "HOLD_TASK" ||
      rawAction === "CARRY_FORWARD"
    ) {
      if (!holdReason?.trim() && !feedback?.trim()) {
        return NextResponse.json(
          { error: "P1 urgent ya carry forward ka reason batana mandatory hai." },
          { status: 400 }
        );
      }

      nextState = "ASSIGNED";
      const reasonText = (holdReason || feedback).trim();
      updateData.description = task.description
        ? `${task.description}\n\n[HOLD/CARRY FORWARD REASON - ${now.toLocaleTimeString()}]: ${reasonText}`
        : `[HOLD/CARRY FORWARD REASON]: ${reasonText}`;
    }
    // 3. SUBMIT WORK PROOF (Employee Action)
    else if (
      rawAction === "SUBMIT" ||
      rawAction === "SUBMIT_WORK" ||
      rawAction === "REVIEW" ||
      rawAction === "SUBMIT_FOR_REVIEW"
    ) {
      nextState = "REVIEW";
      if (feedback?.trim()) {
        updateData.description = task.description
          ? `${task.description}\n\n[DELIVERABLE PROOF]: ${feedback.trim()}`
          : `[DELIVERABLE PROOF]: ${feedback.trim()}`;
      }
    }
    // 4. APPROVE / COMPLETE (Manager Action)
    else if (
      rawAction === "APPROVE" ||
      rawAction === "APPROVED" ||
      rawAction === "COMPLETE" ||
      rawAction === "COMPLETED"
    ) {
      nextState = "COMPLETED";
      updateData.completedAt = now;
    } else {
      nextState = (rawAction || "IN_PROGRESS") as TaskState;
    }

    updateData.status = nextState;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData as any,
    });

    if (feedback && feedback.trim() && (prisma as any).comment) {
      try {
        await (prisma as any).comment.create({
          data: {
            taskId: task.id,
            authorId: currentUserId,
            content: `[${nextState}] ${feedback.trim()}`,
          },
        });
      } catch (commentErr) {
        console.warn("Audit comment skipped:", commentErr);
      }
    }

    return NextResponse.json({
      success: true,
      task: updated,
      status: nextState,
    });
  } catch (error: any) {
    console.error("Task Action Error:", error);
    return NextResponse.json(
      { error: error?.message || "Transition failed" },
      { status: 500 }
    );
  }
}