import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Escalate P2 tasks with less than 1 hour remaining or overdue to P1 Urgent
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const escalatedP2 = await prisma.task.updateMany({
      where: {
        organizationId: session.organizationId,
        priority: "P2",
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        dueAt: { lte: oneHourFromNow },
      },
      data: {
        priority: "P1",
      },
    });

    return NextResponse.json({ escalated: escalatedP2.count });
  } catch (error) {
    console.error("Escalation error:", error);
    return NextResponse.json({ error: "Failed to escalate" }, { status: 500 });
  }
}