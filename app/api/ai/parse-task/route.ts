import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt } = await request.json().catch(() => ({}));
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const now = new Date();
    const currentDateStr = now.toISOString();

    if (openaiApiKey) {
      const systemInstruction = `
You are an intelligent task parsing assistant for an internal ERP/Task Management system called TaskFlow.
Your job is to read instructions written in English, Hindi, or Hinglish/WhatsApp language (e.g., "Aman ko bolo kal shaam 5 baje tak vendor invoices check kare urgent hai aur pdf upload kare").

Current datetime is: ${currentDateStr}.

Extract and output ONLY valid JSON matching this schema:
{
  "title": "Concise formal English title (e.g., Audit Vendor Invoices)",
  "description": "Clear professional description explaining what needs to be done",
  "assigneeName": "Name or email mentioned if any, otherwise empty string",
  "dueAt": "ISO 8601 string for deadline (calculate relative terms like 'kal', 'tomorrow', 'shaam 5 baje' based on current datetime), or empty string",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "estimatedMinutes": number (integer in minutes, default 60 if not specified),
  "completionProofType": "NONE" | "TEXT" | "PDF" | "EXCEL" | "CSV",
  "tags": ["tag1", "tag2"],
  "checklist": ["Step 1", "Step 2"]
}

Rules:
- If user mentions "urgent" or "jaldi", set priority to "URGENT" or "HIGH".
- If user mentions "screenshot", "pdf", "report", or "excel", set completionProofType accordingly.
- Return pure JSON only.
`;

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `Task instruction: "${prompt}"` },
          ],
          temperature: 0.2,
        }),
      });

      if (openaiRes.ok) {
        const result = await openaiRes.json();
        const content = result.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return NextResponse.json(parsed);
        }
      } else {
        const errData = await openaiRes.json().catch(() => ({}));
        console.error("OpenAI API call failed:", errData);
      }
    }

    // Fallback heuristic parser if OPENAI_API_KEY is not configured or fails
    const isUrgent = /urgent|jaldi|turant|asap|aaj hi/i.test(prompt);
    const hasPdf = /pdf|doc|document/i.test(prompt);
    const hasExcel = /excel|sheet|spreadsheet/i.test(prompt);

    const deadline = new Date();
    if (/kal|tomorrow/i.test(prompt)) {
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(18, 0, 0, 0);
    } else {
      deadline.setHours(deadline.getHours() + 4);
    }

    return NextResponse.json({
      title: prompt.slice(0, 50),
      description: prompt,
      assigneeName: "",
      dueAt: deadline.toISOString(),
      priority: isUrgent ? "URGENT" : "MEDIUM",
      estimatedMinutes: 60,
      completionProofType: hasPdf ? "PDF" : hasExcel ? "EXCEL" : "NONE",
      tags: ["quick-assign"],
      checklist: ["Execute task deliverables", "Submit proof / updates"],
    });
  } catch (error) {
    console.error("AI Parse Task Error:", error);
    return NextResponse.json({ error: "Failed to parse task with AI." }, { status: 500 });
  }
}