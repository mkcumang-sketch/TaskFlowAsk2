import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasPermission, isManagementRole } from "@/lib/auth";
import { canTransition, TaskState } from "@/lib/task-workflow";
import { sendTaskNotificationEmail } from "@/lib/email-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session || !session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const organizationId = session.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organization membership required." }, { status: 403 });
  }

  const taskId = (await params).id;
  const body = await request.json();
  const { nextStatus, note, proofUrl, rejectionReason } = body;

  const task = await prisma.task.findUnique({
    where: { id: taskId, organizationId },
    include: { assignees: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  const isAssignee = task.assignees.some((assignee) => assignee.userId === session.id);
  const isManager = isManagementRole(session.role);
  const canManageTasks = hasPermission(session.role, "edit_task") || hasPermission(session.role, "approve_task");
  const assigneeTransition = ["SEEN", "ACCEPTED", "IN_PROGRESS", "WAITING", "BLOCKED", "REVIEW", "ON_HOLD", "NEEDS_CLARIFICATION"].includes(nextStatus);
  const managementTransition = ["ASSIGNED", "APPROVED", "REJECTED", "CANCELLED"].includes(nextStatus);
  if ((!isAssignee && assigneeTransition && !canManageTasks) || (managementTransition && !isManager && !canManageTasks)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canTransition(task.status as TaskState, nextStatus as TaskState)) {
    return NextResponse.json(
      { error: `Invalid transition from ${task.status} to ${nextStatus}` },
      { status: 400 }
    );
  }

  if (nextStatus === "REVIEW" && task.completionProofType !== "NONE" && !proofUrl && !note) {
    return NextResponse.json(
      { error: "Submission requires proof URL or completion notes." },
      { status: 422 }
    );
  }

  const isFinished = nextStatus === "COMPLETED" || nextStatus === "APPROVED";

  const [updatedTask] = await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        completedAt: isFinished ? new Date() : null,
      },
    }),
    prisma.activityLog.create({
      data: {
        taskId,
        userId: session.id,
        action: `STATUS_CHANGED_${nextStatus}`,
        details: `Status changed from ${task.status} to ${nextStatus}${
          note ? ` | Note: ${note}` : ""
        }${rejectionReason ? ` | Reason: ${rejectionReason}` : ""}${
          proofUrl ? ` | Proof: ${proofUrl}` : ""
        }`,
      },
    }),
  ]);

  if (task.emailEnabled) {
    if (nextStatus === "REVIEW" && task.creatorId) {
      prisma.user
        .findUnique({ where: { id: task.creatorId } })
        .then((creator) => {
          if (creator?.email) {
            sendTaskNotificationEmail({
              to: creator.email,
              recipientName: creator.name || "Manager",
              taskTitle: task.title,
              taskId: task.id,
              priority: task.priority,
              dueAt: task.dueAt,
              actorName: session.name || "Team Member",
              type: "TASK_REVIEW_SUBMITTED",
              note: note || undefined,
            });
          }
        })
        .catch((err) => console.error("Email notification error:", err));
    }

    if (nextStatus === "APPROVED" || nextStatus === "REJECTED") {
      const assigneeIds = task.assignees.map((a) => a.userId);
      if (assigneeIds.length > 0) {
        prisma.user
          .findMany({ where: { id: { in: assigneeIds } } })
          .then((assignees) => {
            for (const assignee of assignees) {
              if (assignee.email) {
                sendTaskNotificationEmail({
                  to: assignee.email,
                  recipientName: assignee.name || "Assignee",
                  taskTitle: task.title,
                  taskId: task.id,
                  priority: task.priority,
                  dueAt: task.dueAt,
                  actorName: session.name || "Manager",
                  type: nextStatus === "APPROVED" ? "TASK_APPROVED" : "TASK_REJECTED",
                  note: rejectionReason || undefined,
                });
              }
            }
          })
          .catch((err) => console.error("Email notification error:", err));
      }
    }
  }

  return NextResponse.json({ success: true, task: updatedTask });
}