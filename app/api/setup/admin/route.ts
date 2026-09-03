import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const email = "admin@ask2global.com";
    const rawPassword = "Admin@2390";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 1. Upsert ADMIN role
    const role = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });

    // 2. Upsert Organization (if your schema requires it)
    let org = null;
    try {
      org = await prisma.organization.upsert({
        where: { slug: "ask2global" },
        update: {},
        create: { name: "Ask2Global", slug: "ask2global" },
      });
    } catch {
      // Organization optional/skipped
    }

    // 3. Upsert Admin User
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        roleId: role.id,
        ...(org ? { organizationId: org.id } : {}),
      },
      create: {
        email,
        name: "Admin User",
        passwordHash,
        roleId: role.id,
        ...(org ? { organizationId: org.id } : {}),
      },
      include: { role: true },
    });

    return NextResponse.json({
      success: true,
      message: `Admin ${user.email} provisioned with role ${user.role?.name}`,
    });
  } catch (error) {
    console.error("Admin seed error:", error);
    return NextResponse.json(
      { error: "Failed to provision admin account." },
      { status: 500 }
    );
  }
}