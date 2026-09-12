import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only Admins/Managers can revoke access
    const role = (session.role || "").toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden: Only admins can revoke access" }, { status: 403 });
    }

    const { id: targetUserId } = await params;

    // Prevent admin from deleting themselves
    if (targetUserId === session.id) {
      return NextResponse.json({ error: "You cannot revoke your own access" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true },
    });

    if (!targetUser || targetUser.organizationId !== session.organizationId) {
      return NextResponse.json({ error: "User not found in workspace" }, { status: 404 });
    }

    // Prevent removing system super admins listed in .env
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .toLowerCase()
      .split(",")
      .map((e) => e.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);

    if (adminEmails.includes(targetUser.email.toLowerCase())) {
      return NextResponse.json({ error: "System super admins cannot be removed" }, { status: 400 });
    }

    // Remove active sessions & OAuth account connections
    await prisma.session.deleteMany({ where: { userId: targetUserId } });
    await prisma.oAuthAccount.deleteMany({ where: { userId: targetUserId } });
    await prisma.calendarIntegration.deleteMany({ where: { userId: targetUserId } });

    // Remove the user from the organization
    await prisma.user.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ success: true, message: "User access revoked" });
  } catch (error) {
    console.error("Revoke access error:", error);
    return NextResponse.json({ error: "Failed to revoke access" }, { status: 500 });
  }
}