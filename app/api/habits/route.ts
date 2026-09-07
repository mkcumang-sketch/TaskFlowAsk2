import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.habit.findMany({ where: { organizationId: session.organizationId, userId: session.id, active: true }, include: { logs: true }, orderBy: { createdAt: "asc" } }));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Habit name is required" }, { status: 400 });
  return NextResponse.json(await prisma.habit.create({ data: { organizationId: session.organizationId, userId: session.id, name, frequencyDays: Array.isArray(body.frequencyDays) ? body.frequencyDays : [1, 2, 3, 4, 5, 6, 0] } }), { status: 201 });
}
