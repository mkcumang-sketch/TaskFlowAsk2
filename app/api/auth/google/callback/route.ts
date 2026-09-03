import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { getGoogleOAuthClient, saveGoogleTokens } from "@/lib/google";
import { prisma } from "@/lib/prisma";

const DASHBOARD_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"]);

function loginError(request: Request, code: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", code);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const stateCookie = request.headers.get("cookie")?.match(/(?:^|;\s*)taskflow_oauth_state=([^;]*)/)?.[1];

  if (!code || !returnedState || !stateCookie || returnedState !== stateCookie) {
    return loginError(request, "invalid_oauth_state");
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const { data: profile } = await google.oauth2({ version: "v2", auth: oauth2Client }).userinfo.get();

    if (!profile.id || !profile.email) {
      return loginError(request, "google_profile_missing");
    }

    const email = profile.email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

    if (!user) {
      const organization = await prisma.organization.upsert({
        where: { slug: "ask2global" },
        update: {},
        create: { name: "Ask2Global", slug: "ask2global" },
      });
      const employeeRole = await prisma.role.upsert({
        where: { name: "EMPLOYEE" },
        update: {},
        create: { name: "EMPLOYEE" },
      });
      user = await prisma.user.create({
        data: {
          email,
          name: profile.name || profile.given_name || "Google User",
          avatarUrl: profile.picture || null,
          organizationId: organization.id,
          roleId: employeeRole.id,
        },
        include: { role: true },
      });
    }

    await saveGoogleTokens({
      userId: user.id,
      providerAccountId: profile.id,
      tokens,
    });

    const role = user.role?.name ?? null;
    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role,
    });
    const destination = role && DASHBOARD_ROLES.has(role) ? "/dashboard" : "/my-day";
    const response = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.delete("taskflow_oauth_state");
    return setSessionCookie(response, token);
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return loginError(request, "oauth_failed");
  }
}
