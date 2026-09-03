import { NextResponse } from "next/server";
import { getGoogleOAuthClient } from "@/lib/google";

export async function GET() {
  const oauth2Client = getGoogleOAuthClient();

  // Calendar sync aur login dono ke scopes
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  return NextResponse.json({ authUrl });
}