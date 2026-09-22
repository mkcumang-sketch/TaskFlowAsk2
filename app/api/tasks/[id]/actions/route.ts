import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Priority-based SLA duration in hours
const PRIORITY_HOURS: Record<string, number> = {
  P1: 2,   // 2 Hours
  P2: 4,   // 4 Hours
  P3: 8,   // 8 Hours
  P4: 24,  // 24 Hours
  P5: 48,  // 48 Hours
};

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
    const proofUrl = body.proofUrl || body.mediaUrl || "";
    const proofName = body.proofName || body.mediaName || "";
    const externalLink = body.externalLink || "";

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

    const now = new Date();
    const updateData: Record<string, any> = {};
    let nextState = task.status;

    // 1. ACCEPT TASK (Starts timer according to P1/P2/P3 priority)
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
            error: "Aap ek samay par maximum 3 active tasks le sakte hain. Pehle kisi task ko Hold ya Complete karein.",
          },
          { status: 400 }
        );
      }

      nextState = "IN_PROGRESS";
      updateData.startAt = task.startAt || now;

      // Calculate priority timer SLA from acceptance moment
      const priorityHours = PRIORITY_HOURS[task.priority] || 8;
      updateData.dueAt = new Date(now.getTime() + priorityHours * 60 * 60 * 1000);
    }
    // 2. HOLD / PREEMPT / CARRY FORWARD
    else if (
      rawAction === "HOLD" ||
      rawAction === "HOLD_TASK" ||
      rawAction === "CARRY_FORWARD"
    ) {
      if (!holdReason?.trim() && !feedback?.trim()) {
        return NextResponse.json(
          { error: "Preemption / Hold reason batana zaroori hai." },
          { status: 400 }
        );
      }

      nextState = "ASSIGNED";
      const reasonText = (holdReason || feedback).trim();
      updateData.description = task.description
        ? `${task.description}\n\n[HOLD REASON - ${now.toLocaleTimeString()}]: ${reasonText}`
        : `[HOLD REASON]: ${reasonText}`;
    }
    // 3. SUBMIT WORK PROOF (Description + Voice / PDF / Docs + External Link)
    else if (
      rawAction === "SUBMIT" ||
      rawAction === "SUBMIT_WORK" ||
      rawAction === "REVIEW" ||
      rawAction === "SUBMIT_FOR_REVIEW"
    ) {
      nextState = "REVIEW";

      let proofBlock = `\n\n--- 📌 WORK SUBMISSION [${now.toLocaleString()}] ---`;
      if (feedback?.trim()) proofBlock += `\nSummary: ${feedback.trim()}`;
      if (externalLink?.trim()) proofBlock += `\nLink: ${externalLink.trim()}`;
      if (proofUrl?.trim()) proofBlock += `\nAttached Deliverable (${proofName || "File"}): ${proofUrl.trim()}`;

      updateData.description = task.description ? `${task.description}${proofBlock}` : proofBlock;
    }
    // 4. APPROVE / COMPLETE
    else if (
      rawAction === "APPROVE" ||
      rawAction === "APPROVED" ||
      rawAction === "COMPLETE" ||
      rawAction === "COMPLETED"
    ) {
      if (!isManagerOrAdmin) {
        return NextResponse.json({ error: "Only Admin/Manager can approve deliverables" }, { status: 403 });
      }
      nextState = "COMPLETED";
      updateData.completedAt = now;
    } else {
      nextState = rawAction || "IN_PROGRESS";
    }

    updateData.status = nextState;

    // Prisma update with strictly valid schema fields (no assignedAt)
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData as any,
    });

    return NextResponse.json({
      success: true,
      task: updated,
      status: nextState,
    });
  } catch (error: any) {
    console.error("Task Action Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task state" },
      { status: 500 }
    );
  }
}