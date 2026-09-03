"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AiTaskModal() {
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

      const data = await res.json();

      // Form fields me automatically values populate kar do
      const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
      const descInput = document.querySelector<HTMLTextAreaElement>('textarea[name="description"]');
      const prioritySelect = document.querySelector<HTMLSelectElement>('select[name="priority"]');
      const checklistArea = document.querySelector<HTMLTextAreaElement>('textarea[name="checklist"]');

      if (titleInput && data.title) titleInput.value = data.title;
      if (descInput && data.description) descInput.value = data.description;
      if (prioritySelect && data.priority) prioritySelect.value = data.priority;
      if (checklistArea && Array.isArray(data.checklist)) {
        checklistArea.value = data.checklist.join("\n");
      }

      setOpen(false);
      setPrompt("");
    } catch (err) {
      console.error(err);
      alert("AI task parsing failed. Check server logs.");
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
        className="flex items-center gap-1.5 border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        AI Task Generator
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create Task with Natural Language</h3>
            <p className="text-xs text-slate-500">
              Type instructions naturally. Example: &ldquo;Assign vendor research to Aman by tomorrow 6 PM with high priority and verify pricing checklist&rdquo;
            </p>

            <textarea
              rows={4}
              placeholder="What task needs to be assigned?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-purple-600"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={loading || !prompt.trim()}
                onClick={handleGenerate}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? "Generating..." : "Auto-Fill Form"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}