import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = session.organizationId;

    // 1. Ensure Default Company All-Hands Conversation exists
    let companyChat = await prisma.conversation.findFirst({
      where: {
        organizationId,
        type: "COMPANY_ALL_HANDS",
      },
    });

    if (!companyChat) {
      companyChat = await prisma.conversation.create({
        data: {
          organizationId,
          name: "Company All-Hands",
          description: "All team members company-wide communication",
          type: "COMPANY_ALL_HANDS",
          creatorId: session.id,
          participants: {
            create: {
              userId: session.id,
              role: "ADMIN",
            },
          },
        },
      });
    }

    // 2. Fetch all group, department & project conversations
    const channels = await prisma.conversation.findMany({
      where: {
        organizationId,
        type: { not: "DIRECT" },
      },
      include: {
        department: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    // 3. Fetch all active users in organization for 1-to-1 direct messaging
    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        presenceStatus: true,
        lastSeenAt: true,
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ channels, users });
  } catch (error) {
    console.error("Channels GET error:", error);
    return NextResponse.json({ error: "Failed to fetch channels" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, department, memberIds = [], type = "DEPARTMENT" } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    // Find or create department record if specified
    let departmentRecord = null;
    if (department?.trim()) {
      departmentRecord = await prisma.department.findFirst({
        where: {
          organizationId: session.organizationId,
          name: department.trim(),
        },
      });

      if (!departmentRecord) {
        departmentRecord = await prisma.department.create({
          data: {
            organizationId: session.organizationId,
            name: department.trim(),
          },
        });
      }
    }

    // Map creator as ADMIN and team members as MEMBER
    const uniqueUserIds = Array.from(new Set([session.id, ...memberIds]));
    const participantsPayload = uniqueUserIds.map((userId) => ({
      userId,
      role: (userId === session.id ? "ADMIN" : "MEMBER") as "ADMIN" | "MEMBER",
    }));

    const conversation = await prisma.conversation.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        departmentId: departmentRecord?.id || null,
        type: type === "COMPANY" ? "COMPANY_ALL_HANDS" : "DEPARTMENT",
        creatorId: session.id,
        participants: {
          create: participantsPayload,
        },
      },
      include: {
        department: { select: { id: true, name: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Channels POST error:", error);
    return NextResponse.json({ error: "Failed to create channel" }, { status: 500 });
  }
}