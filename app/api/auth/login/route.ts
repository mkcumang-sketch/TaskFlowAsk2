import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isBoss =
      user.role?.name === "SUPER_ADMIN" ||
      user.role?.name === "ADMIN" ||
      user.role?.name === "OWNER" ||
      user.role?.name === "MANAGER";

    const redirectTo = isBoss ? "/dashboard" : "/my-day";

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name || "",
      organizationId: user.organizationId,
      role: user.role?.name || "MEMBER",
    });

    const response = NextResponse.json({ success: true, redirectTo });
    response.cookies.set("taskflow_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}