import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [today, inbox, habits, availablePool, urgent] = await Promise.all([
    prisma.task.count({ where: { organizationId: session.organizationId, dueAt: { gte: start, lt: end }, status: { notIn: ["COMPLETED", "APPROVED"] } } }),
    prisma.task.count({ where: { organizationId: session.organizationId, status: "DRAFT" } }),
    prisma.habit.count({ where: { organizationId: session.organizationId, userId: session.id, active: true } }),
    prisma.task.count({ where: { organizationId: session.organizationId, assigneeEmail: null, assignees: { none: {} }, status: "ASSIGNED" } }),
    prisma.task.count({ where: { organizationId: session.organizationId, priority: { in: ["P1", "P2"] }, status: { notIn: ["COMPLETED", "APPROVED"] } } }),
  ]);

  return NextResponse.json({ today, inbox, habits, availablePool, urgent });
}
