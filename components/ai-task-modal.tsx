"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export interface ParsedTaskData {
  title?: string;
  description?: string;
  assigneeName?: string;
  dueAt?: string;
  priority?: string;
  estimatedMinutes?: number;
  completionProofType?: string;
  tags?: string[];
  checklist?: string[];
}

export function AiTaskModal({ onParsed }: { onParsed: (data: ParsedTaskData) => void }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/ai/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("AI extraction failed.");

      const data: ParsedTaskData = await res.json();
      onParsed(data);

      setOpen(false);
      setPrompt("");
    } catch (err) {
      console.error(err);
      alert("AI task parsing failed. Make sure GEMINI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 cursor-pointer"
      >
        <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI Task Generator
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">✨ WhatsApp / Natural Language Prompt</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Type naturally in Hindi, English, or Hinglish:
              <br />
              <span className="font-medium text-slate-700">
                &ldquo;Ramesh ko bolo kal shaam 5 baje tak vendor invoices check kare urgent hai aur pdf report upload kare&rdquo;
              </span>
            </p>

            <textarea
              rows={4}
              placeholder="Enter instructions in WhatsApp style..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading || !prompt.trim()}
                onClick={handleGenerate}
                className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
              >
                {loading ? "Analyzing..." : "Auto-Fill Form"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}