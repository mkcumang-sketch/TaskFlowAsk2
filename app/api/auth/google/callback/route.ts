import { NextResponse } from "next/server";
import { getGoogleOAuthClient, saveGoogleTokens } from "@/lib/google";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_cancelled`);
  }

  try {
    const client = getGoogleOAuthClient();

    // 1. Exchange auth code for tokens
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // 2. Fetch Google profile
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return NextResponse.redirect(`${appUrl}/login?error=no_email_provided`);
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name || email.split("@")[0];
    const avatarUrl = profile.picture || null;

    // 3. Resolve Admin Whitelist from .env
    const rawAdminEmails = process.env.ADMIN_EMAILS || "";
    const adminEmails = rawAdminEmails
      .toLowerCase()
      .split(",")
      .map((e) => e.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);

    const isSystemAdmin = adminEmails.some((admin) => admin === email);

    // 4. Ensure Organization & System Roles exist
    let organization = await prisma.organization.findFirst();
    if (!organization) {
      organization = await prisma.organization.create({
        data: { name: "TaskFlow HQ", slug: "taskflow-hq" },
      });
    }

    let adminRole = await prisma.role.findFirst({ where: { name: "ADMIN" } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: "ADMIN" } });
    }

    let employeeRole = await prisma.role.findFirst({ where: { name: "EMPLOYEE" } });
    if (!employeeRole) {
      employeeRole = await prisma.role.create({ data: { name: "EMPLOYEE" } });
    }

    // 5. Query user in DB
    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (isSystemAdmin) {
      if (!user) {
        const cleanName = name.replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase() || "ADMIN";
        user = await prisma.user.create({
          data: {
            name,
            email,
            avatarUrl,
            memberCode: `${cleanName}ADM1`,
            roleId: adminRole.id,
            organizationId: organization.id,
            presenceStatus: "ONLINE",
          },
          include: { role: true },
        });
      } else if (user.roleId !== adminRole.id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { roleId: adminRole.id, avatarUrl: avatarUrl || user.avatarUrl },
          include: { role: true },
        });
      }
    } else {
      if (!user) {
        return NextResponse.redirect(`${appUrl}/login?error=access_denied_not_invited`);
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name || name,
          avatarUrl: avatarUrl || user.avatarUrl,
          presenceStatus: "ONLINE",
          lastSeenAt: new Date(),
        },
        include: { role: true },
      });
    }

    // 6. Save Google account tokens for integrations
    await saveGoogleTokens({
      userId: user.id,
      tokens,
      providerAccountId: profile.id ?? null,
    });

    // 7. Generate JWT token using shared auth helper
    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role?.name || "EMPLOYEE",
    });

    // 8. Redirect directly to /today (landing page in your middleware)
    const response = NextResponse.redirect(`${appUrl}/today`);

    // Match cookie name and options expected by middleware and lib/auth.ts
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Google OAuth Callback Error:", err);
    return NextResponse.redirect(`${appUrl}/login?error=authentication_failed`);
  }
}