import { NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUrl = buildGoogleAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Failed to generate Google Auth URL:", error);
    return NextResponse.json(
      { error: "Google OAuth configuration error. Check your environment variables." },
      { status: 500 }
    );
  }
}