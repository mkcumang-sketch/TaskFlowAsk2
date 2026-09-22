import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canTransition, TaskState } from "@/lib/task-workflow";

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

    // 1. Fetch current task using correct schema relation 'assignees'
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 2. Normalize and determine target next state
    let nextState: TaskState = "IN_PROGRESS";

    if (
      rawAction === "ACCEPT" ||
      rawAction === "ACCEPT_TASK" ||
      rawAction === "START" ||
      rawAction === "START_WORK"
    ) {
      nextState = "IN_PROGRESS";
    } else if (rawAction === "APPROVE" || rawAction === "APPROVED") {
      nextState = "APPROVED";
    } else if (
      rawAction === "REJECT" ||
      rawAction === "REJECTED" ||
      rawAction === "REQUEST_CHANGES" ||
      rawAction === "REWORK"
    ) {
      nextState = "REJECTED";
    } else if (
      rawAction === "SUBMIT" ||
      rawAction === "REVIEW" ||
      rawAction === "SUBMIT_WORK" ||
      rawAction === "SUBMIT_FOR_REVIEW"
    ) {
      nextState = "REVIEW";
    } else if (rawAction === "COMPLETE" || rawAction === "COMPLETED") {
      nextState = "COMPLETED";
    } else {
      nextState = (rawAction || "IN_PROGRESS") as TaskState;
    }

    // 3. Transition check (Admin bypass + canTransition fallback)
    const userRole = ((session as any)?.role || "").toUpperCase();
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"].includes(userRole);
    const currentState = task.status as TaskState;

    if (!isAdmin && typeof canTransition === "function") {
      try {
        const allowed = canTransition(currentState, nextState);
        if (!allowed && currentState !== nextState) {
          if (!(currentState === "ASSIGNED" && nextState === "IN_PROGRESS")) {
            return NextResponse.json(
              { error: `Cannot transition task from ${currentState} to ${nextState}` },
              { status: 400 }
            );
          }
        }
      } catch (wfErr) {
        console.warn("canTransition check skipped:", wfErr);
      }
    }

    // 4. Update task record
    const now = new Date();
    const updateData: Record<string, any> = {
      status: nextState,
    };

    if (nextState === "APPROVED" || nextState === "COMPLETED") {
      updateData.completedAt = now;
    }

    if (nextState === "IN_PROGRESS") {
      if (!task.startAt) updateData.startAt = now;
      if (!(task as any).assignedAt) updateData.assignedAt = now;

      // Auto-link accepting user if not already in assignees
      const isAlreadyAssigned = task.assignees.some((a) => a.userId === currentUserId);
      if (!isAlreadyAssigned) {
        await prisma.taskAssignee.upsert({
          where: {
            taskId_userId: {
              taskId: task.id,
              userId: currentUserId,
            },
          },
          create: {
            taskId: task.id,
            userId: currentUserId,
          } as any,
          update: {},
        });
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData as any,
    });

    // 5. Save comment safely using authorId
    if (feedback && feedback.trim()) {
      try {
        if ((prisma as any).comment) {
          await (prisma as any).comment.create({
            data: {
              taskId: task.id,
              authorId: currentUserId,
              content: `[${nextState}] Feedback: ${feedback.trim()}`,
            },
          });
        }
      } catch (commentErr) {
        console.warn("Audit comment skipped (non-fatal):", commentErr);
      }
    }

    // 6. Notify primary assignee safely
    const primaryAssignee = (task.assignees as any[])?.[0]?.userId;
    if (primaryAssignee && primaryAssignee !== currentUserId) {
      try {
        await prisma.notification.create({
          data: {
            userId: primaryAssignee,
            title: `Task ${nextState === "APPROVED" ? "Approved" : "Updated"}`,
            content: `Task "${task.title}" status changed to ${nextState}. ${
              feedback ? `Feedback: ${feedback}` : ""
            }`,
            link: `/tasks/${task.id}`,
            category: "TASKS",
            priority: "HIGH",
          },
        });
      } catch (notifErr) {
        console.warn("Notification trigger skipped (non-fatal):", notifErr);
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