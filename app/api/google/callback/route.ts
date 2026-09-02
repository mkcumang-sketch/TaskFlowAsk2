import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing Google OAuth code." }, { status: 400 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Google OAuth callback received. Store the token and calendar access securely in your provider integration layer.",
    code,
  });
}
