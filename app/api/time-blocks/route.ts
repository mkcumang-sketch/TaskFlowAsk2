import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const startTime = new Date(body.startTime);
  const endTime = new Date(body.endTime);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) return NextResponse.json({ error: "Valid start and end times are required" }, { status: 400 });
  const block = await prisma.timeBlock.create({ data: { organizationId: session.organizationId, userId: session.id, startTime, endTime, type: ["TASK", "BREAK", "LUNCH", "MEETING"].includes(body.type) ? body.type : "TASK", taskId: body.taskId || null, title: body.title || null } });
  return NextResponse.json(block, { status: 201 });
}
