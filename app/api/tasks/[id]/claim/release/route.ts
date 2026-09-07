import { NextResponse } from "next/server";
import { getSession, isManagementRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const taskId = (await params).id;
  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: session.organizationId }, include: { assignees: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const canRelease = isManagementRole(session.role) || task.assignees.some((assignee) => assignee.userId === session.id) || task.assigneeEmail === session.email;
  if (!canRelease) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await prisma.$transaction(async (tx) => {
    await tx.taskAssignee.deleteMany({ where: { taskId } });
    await tx.task.update({ where: { id: taskId }, data: { assigneeEmail: null, status: "ASSIGNED", completedAt: null } });
    await tx.activityLog.create({ data: { taskId, userId: session.id, action: "TASK_RELEASED", details: "Returned to the organization pool" } });
    return tx.task.findUnique({ where: { id: taskId } });
  });
  return NextResponse.json(result);
}
