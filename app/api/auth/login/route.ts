import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

const DASHBOARD_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Lookup user and attached role
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify bcrypt password hash
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Normalize role name
    const rawRoleName = user.role?.name || "MEMBER";
    const role = rawRoleName.toUpperCase();

    // Create session token
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name ?? "",
      organizationId: user.organizationId,
      role: rawRoleName,
    });

    // Check if role qualifies for Admin Dashboard
    const isDashboardUser = DASHBOARD_ROLES.has(role);
    const redirectTo = isDashboardUser ? "/dashboard" : "/my-day";

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: rawRoleName,
      },
    });

    // Handle setSessionCookie safely whether it is sync or async
    const cookieResult = await Promise.resolve(setSessionCookie(response, token));
    
    // Fallback: If setSessionCookie returned a modified response object, use it; otherwise use response
    return cookieResult instanceof NextResponse ? cookieResult : response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 }
    );
  }
}