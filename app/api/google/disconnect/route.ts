import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { disconnectGoogleAccount } from "@/lib/google";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectGoogleAccount(session.id);

  return NextResponse.json({ success: true, connected: false });
}
