import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = session.organizationId;
  const now = new Date();

  // 1. Core Task Distribution
  const tasks = await prisma.task.findMany({
    where: { organizationId },
    select: {
      id: true,
      status: true,
      priority: true,
      dueAt: true,
      createdAt: true,
      completedAt: true,
      estimatedMinutes: true,
      assignees: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(
    (t) => t.status === "COMPLETED" || t.status === "APPROVED"
  );
  const overdueTasks = tasks.filter(
    (t) =>
      t.status === "OVERDUE" ||
      (t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED" && t.status !== "APPROVED")
  );
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
  const reviewTasks = tasks.filter((t) => t.status === "REVIEW");

  // 2. Completion Rate & Efficiency
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Average Completion Time (in hours)
  let totalCompletionHours = 0;
  let countWithDuration = 0;

  for (const t of completedTasks) {
    if (t.completedAt) {
      const diffMs = new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime();
      totalCompletionHours += diffMs / (1000 * 60 * 60);
      countWithDuration++;
    }
  }

  const avgCompletionHours =
    countWithDuration > 0 ? Number((totalCompletionHours / countWithDuration).toFixed(1)) : 0;

  // 3. Team Member Workload Breakdown
  const memberMap: Record<
    string,
    { id: string; name: string; email: string; assigned: number; completed: number; overdue: number }
  > = {};

  for (const t of tasks) {
    for (const a of t.assignees) {
      const u = a.user;
      if (!memberMap[u.id]) {
        memberMap[u.id] = {
          id: u.id,
          name: u.name || u.email.split("@")[0],
          email: u.email,
          assigned: 0,
          completed: 0,
          overdue: 0,
        };
      }

      memberMap[u.id].assigned++;
      if (t.status === "COMPLETED" || t.status === "APPROVED") {
        memberMap[u.id].completed++;
      }
      if (
        t.status === "OVERDUE" ||
        (t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED" && t.status !== "APPROVED")
      ) {
        memberMap[u.id].overdue++;
      }
    }
  }

  const teamPerformance = Object.values(memberMap);

  return NextResponse.json({
    metrics: {
      totalTasks,
      completedCount: completedTasks.length,
      overdueCount: overdueTasks.length,
      inProgressCount: inProgressTasks.length,
      reviewCount: reviewTasks.length,
      completionRate,
      avgCompletionHours,
    },
    teamPerformance,
  });
}