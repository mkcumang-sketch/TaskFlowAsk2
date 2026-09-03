import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";

export async function GET() {
  const state = crypto.randomBytes(32).toString("hex");
  const oauth2Client = getGoogleOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("taskflow_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
