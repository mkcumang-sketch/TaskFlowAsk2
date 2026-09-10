import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const recipientId = searchParams.get("recipientId");

    // 1. Direct 1-on-1 Messages
    if (recipientId) {
      if (recipientId === session.id) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }

      let dm = await prisma.conversation.findFirst({
        where: {
          organizationId: session.organizationId,
          type: "DIRECT",
          AND: [
            { participants: { some: { userId: session.id } } },
            { participants: { some: { userId: recipientId } } },
          ],
        },
      });

      // Auto-create 1-on-1 DM conversation if it does not exist
      if (!dm) {
        dm = await prisma.conversation.create({
          data: {
            organizationId: session.organizationId,
            type: "DIRECT",
            creatorId: session.id,
            participants: {
              create: [
                { userId: session.id, role: "MEMBER" },
                { userId: recipientId, role: "MEMBER" },
              ],
            },
          },
        });
      }

      const messages = await prisma.message.findMany({
        where: { conversationId: dm.id },
        include: {
          sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      return NextResponse.json({ channelId: dm.id, messages });
    }

    // 2. Group / Department / Company Messages
    if (!channelId) {
      return NextResponse.json({ error: "channelId or recipientId is required" }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: channelId },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json({ channelId, messages });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, content, mediaUrl, mediaName, taskId } = body;

    if (!channelId || (!content?.trim() && !mediaUrl)) {
      return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: channelId,
        senderId: session.id,
        content: content?.trim() || "",
        mediaUrl: mediaUrl || null,
        mediaName: mediaName || null,
        taskId: taskId || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Update conversation sorting timestamp
    await prisma.conversation.update({
      where: { id: channelId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}