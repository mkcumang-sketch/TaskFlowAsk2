import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      taskStatus: status,
    };

    // Agar proof attach kiya gaya hai, to description ya comments me record karein
    if (proofNote || proofUrl) {
      await prisma.comment.create({
        data: {
          taskId,
          authorId: session.id,
          content: `📌 Work Proof Submitted:\n${proofUrl ? `🔗 Link: ${proofUrl}\n` : ""}${proofNote ? `📝 Note: ${proofNote}` : ""}`,
        },
      });
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update task status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}