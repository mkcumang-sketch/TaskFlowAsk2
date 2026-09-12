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

    // 1. Fetch current task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 2. Resolve Target Next State
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
    } else if (action === "SUBMIT" || action === "REVIEW") {
      nextState = "REVIEW";
    } else if (action === "COMPLETE" || action === "COMPLETED") {
      nextState = "COMPLETED";
    } else {
      nextState = action as TaskState;
    }

    // 3. Check Transition Safety with Role Override
    const currentState = task.status as TaskState;
    const isAllowed = canTransition(currentState, nextState, session.role);

    if (!isAllowed) {
      return NextResponse.json(
        { error: `Cannot transition task from ${currentState} to ${nextState}` },
        { status: 400 }
      );
    }

    // 4. Update Task in DB (No complex transactions that fail in MongoDB)
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: nextState,
        completedAt: nextState === "APPROVED" || nextState === "COMPLETED" ? new Date() : null,
      },
    });

    // 5. Store Review / Rejection Feedback if provided
    if (feedback && feedback.trim()) {
      await prisma.taskComment.create({
        data: {
          taskId: task.id,
          userId: session.id,
          content: `[${nextState}] Feedback: ${feedback.trim()}`,
        },
      }).catch(() => null);
    }

    // 6. Notify Assignee
    const primaryAssignee = task.assignments?.[0]?.userId;
    if (primaryAssignee && primaryAssignee !== session.id) {
      await prisma.notification.create({
        data: {
          userId: primaryAssignee,
          title: `Task ${nextState === "APPROVED" ? "Approved" : "Sent Back for Rework"}`,
          content: `Task "${task.title}" status changed to ${nextState}. ${feedback ? `Feedback: ${feedback}` : ""}`,
          link: `/tasks/${task.id}`,
          category: "TASKS",
          priority: "HIGH",
        },
      }).catch(() => null);
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