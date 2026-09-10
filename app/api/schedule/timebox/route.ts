import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, dateStr, startHour, startMinute = 0, durationMinutes = 60 } = body;

    if (!taskId || !dateStr || startHour === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const startAt = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
    const dueAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        startAt,
        dueAt,
        estimatedMinutes: durationMinutes,
        status: task.status === "DRAFT" || task.status === "BACKLOG" ? "ASSIGNED" : task.status,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Timeboxing error:", error);
    return NextResponse.json({ error: "Failed to allocate time slot" }, { status: 500 });
  }
}