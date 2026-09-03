import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, SessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const email = "admin@ask2global.com";
    const password = "admin@2390";
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Ask2Global",
          slug: "ask2global",
        },
      });
    }

    // 2. Role
    let role = await prisma.role.findFirst({
      where: { name: { in: ["SUPER_ADMIN", "ADMIN", "OWNER"] } },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: "SUPER_ADMIN",
        },
      });
    }

    // 3. User
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        organizationId: org.id,
        roleId: role.id,
      },
      create: {
        email,
        name: "Super Admin",
        passwordHash,
        organizationId: org.id,
        roleId: role.id,
      },
    });

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: "SUPER_ADMIN",
    };

    const token = await createSessionToken(sessionUser);
    const response = NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));

    return setSessionCookie(response, token);
  } catch (error) {
    console.error("Quick admin error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}