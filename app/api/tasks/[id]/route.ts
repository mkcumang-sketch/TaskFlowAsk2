import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = (await params).id;
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: session.organizationId,
    },
    include: {
      creator: true,
      comments: { include: { author: true } },
      assignees: { include: { user: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const taskId = (await params).id;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: session.organizationId,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: body.status,
      priority: body.priority,
      dueAt: body.dueAt ? new Date(body.dueAt) : task.dueAt,
      description: body.description ?? task.description,
    },
    include: {
      creator: true,
      assignees: { include: { user: true } },
      comments: true,
    },
  });

  return NextResponse.json(updatedTask);
}
