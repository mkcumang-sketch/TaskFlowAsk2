import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { organizationId: session.organizationId },
  });

  const summary = {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === "COMPLETED" || task.status === "APPROVED").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    overdue: tasks.filter((task) => task.status === "OVERDUE").length,
    review: tasks.filter((task) => task.status === "REVIEW").length,
  };

  return NextResponse.json(summary);
}
