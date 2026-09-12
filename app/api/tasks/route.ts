import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Calculate SLA deadline based on Priority
function calculateSlaDueDate(priority: string): Date {
  const now = Date.now();
  switch (priority) {
    case "P1": // Critical: 2 Hours
      return new Date(now + 2 * 60 * 60 * 1000);
    case "P2": // 4 Hours
      return new Date(now + 4 * 60 * 60 * 1000);
    case "P3": // 8 Hours
      return new Date(now + 8 * 60 * 60 * 1000);
    case "P4": // 24 Hours
      return new Date(now + 24 * 60 * 60 * 1000);
    case "P5": // 48 Hours
    default:
      return new Date(now + 48 * 60 * 60 * 1000);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      assigneeIds = [],
      departmentId,
      projectId,
      priority = "P3",
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Task Title is required" }, { status: 400 });
    }

    // 1. Resolve combined user assignments
    const finalAssigneeSet = new Set<string>(
      Array.isArray(assigneeIds) ? assigneeIds.filter(Boolean) : []
    );

    // If a Department is assigned, add all users from that department
    if (departmentId) {
      const deptMembers = await prisma.user.findMany({
        where: {
          organizationId: session.organizationId,
          departmentId: departmentId,
        },
        select: { id: true },
      });
      deptMembers.forEach((m) => finalAssigneeSet.add(m.id));
    }

    const calculatedDueAt = calculateSlaDueDate(priority);

    // 2. Create Task with combined assignees in TaskAssignee relation
    const task = await prisma.task.create({
      data: {
        organizationId: session.organizationId,
        creatorId: session.id,
        title: title.trim(),
        description: description?.trim() || null,
        status: finalAssigneeSet.size > 0 ? "ASSIGNED" : "DRAFT",
        priority: priority || "P3",
        projectId: projectId || null,
        departmentId: departmentId || null,
        dueAt: calculatedDueAt,
        assignees: {
          create: Array.from(finalAssigneeSet).map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        subtasks: true,
      },
    });

    // 3. Trigger in-app notifications to all assigned employees
    if (finalAssigneeSet.size > 0) {
      const notificationPromises = Array.from(finalAssigneeSet).map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            organizationId: session.organizationId,
            title: `New Task Assigned: ${priority} Priority`,
            content: `You were assigned to "${task.title}". SLA: ${priority}`,
            link: `/tasks/${task.id}`,
            category: "TASKS",
            priority: priority === "P1" ? "URGENT" : "MEDIUM",
          },
        }).catch(() => null)
      );
      await Promise.all(notificationPromises);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("Task creation failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to create task" }, { status: 500 });
  }
}