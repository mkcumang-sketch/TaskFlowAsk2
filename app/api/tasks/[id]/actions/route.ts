import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    const body = await request.json();
    const { action, responseNote, fileUrl, fileName } = body;

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
      include: { creator: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 1. Action: Employee starts work
    if (action === "START_WORK") {
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "IN_PROGRESS",
          startAt: new Date(),
        },
      });

      // Send real-time in-app notification to the Admin/Task Creator
      if (task.creatorId && task.creatorId !== session.id) {
        await prisma.notification.create({
          data: {
            organizationId: session.organizationId,
            userId: task.creatorId,
            actorId: session.id,
            category: "TASKS",
            priority: "MEDIUM",
            title: `Work Started: ${task.title}`,
            content: `${session.name || session.email || "Employee"} has started work on "${task.title}".`,
            link: `/tasks/${task.id}`,
            entityType: "TASK",
            entityId: task.id,
          },
        });
      }

      return NextResponse.json(updated);
    }

    // 2. Action: Employee submits deliverable notes & file attachment
    if (action === "SUBMIT_WORK") {
      if (fileUrl) {
        await prisma.attachment.create({
          data: {
            taskId: task.id,
            userId: session.id,
            name: fileName || "deliverable-attachment",
            url: fileUrl,
          },
        });
      }

      if (responseNote) {
        await prisma.comment.create({
          data: {
            taskId: task.id,
            authorId: session.id,
            content: `Deliverable Response:\n${responseNote}`,
          },
        });
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "REVIEW",
        },
      });

      // Alert the Admin/Task Creator to review deliverable
      if (task.creatorId) {
        await prisma.notification.create({
          data: {
            organizationId: session.organizationId,
            userId: task.creatorId,
            actorId: session.id,
            category: "APPROVALS",
            priority: "HIGH",
            title: `Deliverable Submitted: ${task.title}`,
            content: `${session.name || session.email || "Employee"} has completed work and submitted response files for review.`,
            link: `/tasks/${task.id}`,
            entityType: "TASK",
            entityId: task.id,
          },
        });
      }

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Action handler error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}