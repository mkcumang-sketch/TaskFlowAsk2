import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await params).id;
  const note = await prisma.brainDumpNote.findFirst({ where: { id, userId: session.id, organizationId: session.organizationId } });
  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({ data: { organizationId: session.organizationId!, creatorId: session.id, title: note.content.slice(0, 120), description: note.content, status: "DRAFT", priority: "P3", emailEnabled: false } });
    await tx.brainDumpNote.update({ where: { id }, data: { isConverted: true, convertedTaskId: task.id } });
    return task;
  });
  return NextResponse.json(result, { status: 201 });
}
