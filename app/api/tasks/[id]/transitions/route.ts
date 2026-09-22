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
    const rawAction = (body.action || body.status || body.nextStatus || "REVIEW").toUpperCase();
    const proofUrl = body.proofUrl || body.proofLink || body.link || body.mediaUrl || "";
    const notes = body.notes || body.feedback || body.comment || body.description || "";

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const now = new Date();
    const updateData: Record<string, any> = {
      status: "REVIEW",
    };

    // Format deliverable proof cleanly
    let proofBlock = `\n\n--- 📌 WORK PROOF SUBMITTED [${now.toLocaleString()}] ---`;
    if (proofUrl?.trim()) proofBlock += `\nProof / Deliverable Link: ${proofUrl.trim()}`;
    if (notes?.trim()) proofBlock += `\nSubmission Notes: ${notes.trim()}`;

    updateData.description = task.description ? `${task.description}${proofBlock}` : proofBlock;

    // Prisma update with valid fields only
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData as any,
    });

    return NextResponse.json({
      success: true,
      task: updated,
      status: "REVIEW",
    });
  } catch (error: any) {
    console.error("Transitions API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit work proof" },
      { status: 500 }
    );
  }
}