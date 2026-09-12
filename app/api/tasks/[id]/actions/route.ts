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
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id || resolvedParams.taskId;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const action = body.action || body.status || body.nextStatus;
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

    // 2. Determine target next state
    let nextState: TaskState = "IN_PROGRESS";

    if (action === "APPROVE" || action === "APPROVED") {
      nextState = "APPROVED";
    } else if (
      action === "REJECT" ||
      action === "REJECTED" ||
      action === "REQUEST_CHANGES" ||
      action === "REWORK"
    ) {
      nextState = "REJECTED";
    } else if (action === "SUBMIT" || action === "REVIEW" || action === "SUBMIT_WORK") {
      nextState = "REVIEW";
    } else if (action === "COMPLETE" || action === "COMPLETED") {
      nextState = "COMPLETED";
    } else if (action === "START_WORK") {
      nextState = "IN_PROGRESS";
    } else {
      nextState = action as TaskState;
    }

    // 3. Transition check (Admin bypass + 2-argument canTransition)
    const userRole = (session.role || "").toUpperCase();
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"].includes(userRole);
    const currentState = task.status as TaskState;

    if (!isAdmin && !canTransition(currentState, nextState)) {
      return NextResponse.json(
        { error: `Cannot transition task from ${currentState} to ${nextState}` },
        { status: 400 }
      );
    }

    // 4. Update task status directly
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: nextState,
        completedAt: nextState === "APPROVED" || nextState === "COMPLETED" ? new Date() : null,
      },
    });

    // 5. Save comment safely if comment table exists
    if (feedback && feedback.trim()) {
      try {
        if ((prisma as any).comment) {
          await (prisma as any).comment.create({
            data: {
              taskId: task.id,
              userId: session.id,
              content: `[${nextState}] Feedback: ${feedback.trim()}`,
            },
          });
        }
      } catch (commentErr) {
        console.warn("Audit comment skipped (non-fatal):", commentErr);
      }
    }

    // 6. Notify Assignee using correct assignees relation
    const primaryAssignee = (task.assignees as any[])?.[0]?.userId;
    if (primaryAssignee && primaryAssignee !== session.id) {
      try {
        await prisma.notification.create({
          data: {
            userId: primaryAssignee,
            title: `Task ${nextState === "APPROVED" ? "Approved" : "Sent Back for Rework"}`,
            content: `Task "${task.title}" status changed to ${nextState}. ${feedback ? `Feedback: ${feedback}` : ""}`,
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