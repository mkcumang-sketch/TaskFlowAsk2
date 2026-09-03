import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getSession, createSessionToken } from "@/lib/auth";
import { getGoogleOAuthClient } from "@/lib/google";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Google profile fetch karo
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_email`);
    }

    const currentSession = await getSession();

    let targetUserId = currentSession?.id;
    let targetOrgId = currentSession?.organizationId;
    let userRole = currentSession?.role || "MEMBER";

    // Agar user pehle se logged in nahi hai (Login with Google kiya hai):
    if (!targetUserId) {
      let existingUser = await prisma.user.findUnique({
        where: { email: profile.email },
        include: { role: true },
      });

      if (!existingUser) {
        // Agar naya user hai toh default organization me add karo
        let defaultOrg = await prisma.organization.findFirst();
        if (!defaultOrg) {
          defaultOrg = await prisma.organization.create({
            data: { name: "Ask2Global", slug: "ask2global" },
          });
        }

        let defaultRole = await prisma.role.findFirst({ where: { name: "MEMBER" } });
        if (!defaultRole) {
          defaultRole = await prisma.role.create({ data: { name: "MEMBER" } });
        }

        existingUser = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name || "Team Member",
            organizationId: defaultOrg.id,
            roleId: defaultRole.id,
          },
          include: { role: true },
        });
      }

      targetUserId = existingUser.id;
      targetOrgId = existingUser.organizationId;
      userRole = existingUser.role?.name || "MEMBER";
    }

    // Google Tokens DB me upsert karo (OAuthAccount model me)
    const existingOAuth = await prisma.oAuthAccount.findFirst({
      where: {
        userId: targetUserId,
        provider: "google",
      },
    });

    if (existingOAuth) {
      await prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: tokens.access_token || existingOAuth.accessToken,
          refreshToken: tokens.refresh_token || existingOAuth.refreshToken,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    } else {
      await prisma.oAuthAccount.create({
        data: {
          userId: targetUserId,
          provider: "google",
          providerAccountId: profile.id || profile.email,
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    }

    // Session token create karo
    const token = await createSessionToken({
      id: targetUserId,
      email: profile.email,
      name: profile.name || "User",
      organizationId: targetOrgId || "",
      role: userRole,
    });

    const isBoss =
      userRole === "SUPER_ADMIN" ||
      userRole === "ADMIN" ||
      userRole === "OWNER" ||
      userRole === "MANAGER";

    const destination = isBoss ? "/dashboard" : "/my-day";
    const response = NextResponse.redirect(`${baseUrl}${destination}`);

    response.cookies.set("taskflow_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failed`);
  }
}