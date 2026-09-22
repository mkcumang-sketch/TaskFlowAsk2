import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getSession();
    // In your session type, user id is `session.id`
    const currentUserId = session?.id;

    if (!session?.organizationId || !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.role || "").toUpperCase();
    const isAuthorized = ["ADMIN", "SUPER_ADMIN", "OWNER", "MANAGER"].includes(userRole);
    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Manager role required" },
        { status: 403 }
      );
    }

    const resolvedParams = await Promise.resolve(context.params);
    const memberId = resolvedParams?.id;

    if (!memberId) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    if (memberId === currentUserId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: session.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // 1. Remove from all conversations
    await prisma.conversationParticipant.deleteMany({
      where: { userId: memberId },
    }).catch(() => null);

    // 2. Remove task assignments
    await prisma.taskAssignee.deleteMany({
      where: { userId: memberId },
    }).catch(() => null);

    // 3. Clear session records if session table exists
    if ((prisma as any).session) {
      await (prisma as any).session.deleteMany({
        where: { userId: memberId },
      }).catch(() => null);
    }

    // 4. Delete user record
    await prisma.user.delete({
      where: { id: memberId },
    });

    return NextResponse.json(
      { success: true, message: "Employee removed successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete employee" },
      { status: 500 }
    );
  }
}