import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const habitId = (await params).id;
  const body = await request.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: session.id } });
  if (!habit) return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  const log = await prisma.habitLog.upsert({ where: { habitId_date: { habitId, date } }, update: { completed: Boolean(body.completed) }, create: { habitId, userId: session.id, date, completed: Boolean(body.completed) } });
  return NextResponse.json(log);
}
