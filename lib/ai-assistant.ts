export interface ParsedTaskResult {
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeEmail?: string;
  dueAt?: string;
  estimatedMinutes?: number;
  checklist: string[];
}

export async function parseTaskWithAI(userInput: string): Promise<ParsedTaskResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  const systemPrompt = `You are an AI task extraction engine for TASKFLOW. 
Parse the user's task request into a strict JSON object with these exact keys:
- "title": (string) Short clear task title.
- "description": (string) Additional context or scope.
- "priority": ("LOW" | "MEDIUM" | "HIGH" | "URGENT") Default to "MEDIUM".
- "assigneeEmail": (string or empty string if not mentioned)
- "dueAt": (ISO 8601 string or empty string if not mentioned, relative to current time)
- "estimatedMinutes": (number in minutes, default 60)
- "checklist": (array of 2-5 actionable subtask steps)

Output MUST be raw JSON without markdown code blocks.`;

  // 1. Primary Provider: Google Gemini
  if (geminiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\nUser request: "${userInput}"` }],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";
        const cleanJson = rawText.replace(/^```json/g, "").replace(/^```/g, "").replace(/```$/g, "").trim();
        return JSON.parse(cleanJson);
      }
    } catch (err) {
      console.warn("Gemini parsing failed, attempting fallback:", err);
    }
  }

  // 2. Secondary Provider: OpenAI / Compatible
  if (openAIKey) {
    try {
      const res = await fetch("[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return JSON.parse(data.choices[0].message.content);
      }
    } catch (err) {
      console.warn("OpenAI parsing failed:", err);
    }
  }

  // 3. Fallback Heuristic Parser (Agar API keys configured nahi hain)
  const isUrgent = /urgent|asap|critical/i.test(userInput);
  const isHigh = /high priority|important/i.test(userInput);

  return {
    title: userInput.slice(0, 60),
    description: userInput,
    priority: isUrgent ? "URGENT" : isHigh ? "HIGH" : "MEDIUM",
    estimatedMinutes: 60,
    checklist: ["Review scope", "Execute deliverables", "Submit proof"],
  };
}