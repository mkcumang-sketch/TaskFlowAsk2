import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 📩 GET: Messages load karna (Channels & 1:1 Direct Messages)
export async function GET(request: Request) {
  try {
    const session = await getSession();
    const currentUserId = session?.id || (session as any)?.userId;

    if (!session?.organizationId || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const recipientId = searchParams.get("recipientId");

    // 1. Direct 1-on-1 Messages
    if (recipientId) {
      if (recipientId === currentUserId) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }

      let dm = await prisma.conversation.findFirst({
        where: {
          organizationId: session.organizationId,
          type: "DIRECT",
          AND: [
            { participants: { some: { userId: currentUserId } } },
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
            creatorId: currentUserId,
            participants: {
              create: [
                { userId: currentUserId, role: "MEMBER" },
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

// 🚀 POST: Message send karna (Direct recipient ya Channel ID dono support karta hai)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const currentUserId = session?.id || (session as any)?.userId;

    if (!session?.organizationId || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { content, mediaUrl, mediaName, taskId, recipientId } = body;
    let targetChannelId = body.channelId;

    if (!content?.trim() && !mediaUrl) {
      return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
    }

    // 🔍 Agar Individual Direct Chat hai (recipientId provided hai aur targetChannelId nahi mili)
    if (!targetChannelId && recipientId) {
      if (recipientId === currentUserId) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }

      let dm = await prisma.conversation.findFirst({
        where: {
          organizationId: session.organizationId,
          type: "DIRECT",
          AND: [
            { participants: { some: { userId: currentUserId } } },
            { participants: { some: { userId: recipientId } } },
          ],
        },
      });

      // Agar direct chat record nahi hai, toh pehle dono users ke beech nayi conversation banao
      if (!dm) {
        dm = await prisma.conversation.create({
          data: {
            organizationId: session.organizationId,
            type: "DIRECT",
            creatorId: currentUserId,
            participants: {
              create: [
                { userId: currentUserId, role: "MEMBER" },
                { userId: recipientId, role: "MEMBER" },
              ],
            },
          },
        });
      }

      targetChannelId = dm.id;
    }

    if (!targetChannelId) {
      return NextResponse.json({ error: "Valid channelId or recipientId is required" }, { status: 400 });
    }

    // Message database mein insert karein
    const message = await prisma.message.create({
      data: {
        conversationId: targetChannelId,
        senderId: currentUserId,
        content: content?.trim() || "",
        mediaUrl: mediaUrl || null,
        mediaName: mediaName || null,
        taskId: taskId || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Update conversation sorting timestamp for WhatsApp/Telegram order
    await prisma.conversation.update({
      where: { id: targetChannelId },
      data: { lastMessageAt: new Date() },
    }).catch(() => null);

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}