import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await request.json();
    const minutes = Number(body.minutes) || 1;

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [, updatedTask] = await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          taskId,
          userId: session.id,
          minutes,
          note: body.note || "Focus timer increment",
        },
      }),
      prisma.task.update({
        where: { id: taskId },
        data: {
          actualMinutes: { increment: minutes },
        },
      }),
    ]);

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Time tracking error:", error);
    return NextResponse.json({ error: "Failed to record time" }, { status: 500 });
  }
}