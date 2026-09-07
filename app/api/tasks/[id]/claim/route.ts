import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taskId = (await params).id;

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: session.organizationId }, include: { assignees: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.assigneeEmail || task.assignees.length > 0 || task.status !== "ASSIGNED") {
    return NextResponse.json({ error: "Task is no longer available." }, { status: 409 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const claimed = await tx.task.updateMany({
      where: { id: taskId, organizationId: session.organizationId, assigneeEmail: null, assignees: { none: {} }, status: "ASSIGNED" },
      data: { assigneeEmail: session.email, status: "ACCEPTED" },
    });
    if (claimed.count !== 1) throw new Error("TASK_ALREADY_CLAIMED");
    await tx.taskAssignee.create({ data: { taskId, userId: session.id } });
    await tx.activityLog.create({ data: { taskId, userId: session.id, action: "TASK_CLAIMED", details: `Claimed by ${session.email}` } });
    return tx.task.findUnique({ where: { id: taskId }, include: { assignees: { include: { user: true } } } });
  });

  return NextResponse.json(result);
}
