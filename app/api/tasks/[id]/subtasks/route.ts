import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const subtask = await prisma.subtask.create({
    data: {
      taskId,
      title: body.title.trim(),
    },
  });

  return NextResponse.json(subtask, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.id) {
    return NextResponse.json({ error: "Subtask ID is required" }, { status: 400 });
  }

  const updated = await prisma.subtask.update({
    where: { id: body.id },
    data: { completed: Boolean(body.completed) },
  });

  return NextResponse.json(updated);
}