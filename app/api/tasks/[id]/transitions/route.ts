import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const session = await getSession();
    const currentUserId = (session as any)?.userId || (session as any)?.id;

    if (!session || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = resolvedParams?.id;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const rawAction = (body.action || body.status || body.nextStatus || "").toUpperCase();
    const notes = (body.notes || body.feedback || body.comment || body.reason || "").trim();
    const proofUrl = (body.proofUrl || body.proofLink || body.link || body.mediaUrl || "").trim();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date();
    const updateData: Record<string, any> = {};
    let finalStatus = task.status;

    // 1. ✅ APPROVE TASK (Manager/Admin approves work)
    if (
      rawAction === "APPROVE" ||
      rawAction === "APPROVED" ||
      rawAction === "COMPLETE" ||
      rawAction === "COMPLETED" ||
      rawAction === "APPROVE_TASK"
    ) {
      finalStatus = "COMPLETED";
      updateData.status = "COMPLETED";
      updateData.completedAt = now;

      const approvalNote = notes ? `\n\n--- ✅ TASK APPROVED [${now.toLocaleString()}] ---\nNote: ${notes}` : `\n\n--- ✅ TASK APPROVED [${now.toLocaleString()}] ---`;
      updateData.description = task.description ? `${task.description}${approvalNote}` : approvalNote;
    }
    // 2. ❌ REJECT / REQUEST CHANGES (Sends task back to IN_PROGRESS for rework)
    else if (
      rawAction === "REJECT" ||
      rawAction === "REJECTED" ||
      rawAction === "REQUEST_CHANGES" ||
      rawAction === "REWORK"
    ) {
      finalStatus = "IN_PROGRESS";
      updateData.status = "IN_PROGRESS";

      const rejectionNote = notes
        ? `\n\n--- ❌ CHANGES REQUESTED [${now.toLocaleString()}] ---\nReason: ${notes}`
        : `\n\n--- ❌ CHANGES REQUESTED [${now.toLocaleString()}] ---\nPlease revise deliverables.`;
      updateData.description = task.description ? `${task.description}${rejectionNote}` : rejectionNote;
    }
    // 3. 📤 SUBMIT WORK PROOF (Employee submits deliverable)
    else if (
      rawAction === "SUBMIT" ||
      rawAction === "SUBMIT_WORK" ||
      rawAction === "REVIEW" ||
      rawAction === "SUBMIT_FOR_REVIEW"
    ) {
      finalStatus = "REVIEW";
      updateData.status = "REVIEW";

      let proofBlock = `\n\n--- 📌 WORK PROOF SUBMITTED [${now.toLocaleString()}] ---`;
      if (proofUrl) proofBlock += `\nProof / Deliverable: ${proofUrl}`;
      if (notes) proofBlock += `\nSubmission Notes: ${notes}`;

      updateData.description = task.description ? `${task.description}${proofBlock}` : proofBlock;
    }
    // 4. ⚡ ACCEPT / START
    else if (
      rawAction === "ACCEPT" ||
      rawAction === "ACCEPT_TASK" ||
      rawAction === "START" ||
      rawAction === "START_WORK"
    ) {
      finalStatus = "IN_PROGRESS";
      updateData.status = "IN_PROGRESS";
      if (!task.startAt) updateData.startAt = now;
    } else {
      finalStatus = rawAction || "IN_PROGRESS";
      updateData.status = finalStatus;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData as any,
    });

    return NextResponse.json({
      success: true,
      task: updated,
      status: finalStatus,
    });
  } catch (error: any) {
    console.error("Transitions API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process task transition" },
      { status: 500 }
    );
  }
}