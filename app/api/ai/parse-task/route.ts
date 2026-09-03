import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseTaskWithAI } from "@/lib/ai-assistant";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const prompt = body?.prompt;

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const parsed = await parseTaskWithAI(prompt);
  return NextResponse.json(parsed);
}