import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await prisma.brainDumpNote.findMany({ where: { organizationId: session.organizationId, userId: session.id }, orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { content } = await request.json();
  if (typeof content !== "string" || !content.trim()) return NextResponse.json({ error: "Content is required" }, { status: 400 });
  return NextResponse.json(await prisma.brainDumpNote.create({ data: { organizationId: session.organizationId, userId: session.id, content: content.trim() } }), { status: 201 });
}
