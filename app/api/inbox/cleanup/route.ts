import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Saare non-direct conversations fetch karein
    const conversations = await prisma.conversation.findMany({
      where: {
        organizationId: session.organizationId,
        type: { not: "DIRECT" },
      },
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const seenMap = new Map<string, string>(); // key -> keepId
    const toDeleteIds: string[] = [];

    for (const conv of conversations) {
      // Key banayein Type + DepartmentId ya Type + Name se
      const key = conv.departmentId
        ? `${conv.type}_DEPT_${conv.departmentId}`
        : `${conv.type}_NAME_${conv.name?.trim().toLowerCase()}`;

      if (seenMap.has(key)) {
        // Duplicate mila, delete list mein daalein
        toDeleteIds.push(conv.id);
      } else {
        seenMap.set(key, conv.id);
      }
    }

    if (toDeleteIds.length > 0) {
      // Pehle messages aur participants delete karein
      await prisma.message.deleteMany({
        where: { conversationId: { in: toDeleteIds } },
      });
      await prisma.conversationParticipant.deleteMany({
        where: { conversationId: { in: toDeleteIds } },
      });
      // Conversation delete karein
      await prisma.conversation.deleteMany({
        where: { id: { in: toDeleteIds } },
      });
    }

    return NextResponse.json({
      success: true,
      deletedCount: toDeleteIds.length,
      deletedIds: toDeleteIds,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}