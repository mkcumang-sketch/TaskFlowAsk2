import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;

  const entries = await prisma.timeEntry.findMany({
    where: { taskId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;
  const body = await request.json().catch(() => ({}));
  const minutes = Math.max(1, Math.round(Number(body.minutes) || 1));
  const note = body.note ? String(body.note).trim() : null;

  // 1. Create TimeEntry
  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      userId: session.id,
      minutes,
      note,
    },
  });

  // 2. Task ka actualMinutes recalculate karke aggregate update karo
  const aggregated = await prisma.timeEntry.aggregate({
    where: { taskId },
    _sum: { minutes: true },
  });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      actualMinutes: aggregated._sum.minutes || 0,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}