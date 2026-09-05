"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface ParsedTask {
  title: string;
  tags: string[];
  project?: string;
  estimatedMinutes?: number;
  dueAt?: string;
}

export function parseCapture(input: string): ParsedTask {
  let text = input.trim();

  // 1. Tags: #frontend #bug
  const tags = [...text.matchAll(/#([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);

  // 2. Project: +TASKFLOW +marketing
  const projectMatch = text.match(/\+([a-zA-Z0-9_-]+)/);
  const project = projectMatch ? projectMatch[1] : undefined;

  // 3. Estimate: 1h, 30m, 45mins, 2hrs
  const estimateMatch = text.match(/\b(\d+)\s*(m|min|mins|h|hr|hrs)\b/i);
  const estimatedMinutes = estimateMatch
    ? Number(estimateMatch[1]) * (/h|hr|hrs/i.test(estimateMatch[2]) ? 60 : 1)
    : undefined;

  // 4. Due date: @tomorrow, @today, @friday, etc.
  const dueMatch = text.match(/@(tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);

  let dueAt: string | undefined;
  if (dueMatch) {
    const due = new Date();
    const value = dueMatch[1].toLowerCase();
    if (value === "tomorrow") {
      due.setDate(due.getDate() + 1);
    } else if (value === "next week") {
      due.setDate(due.getDate() + 7);
    } else if (value !== "today") {
      const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const target = weekdays.indexOf(value);
      const delta = (target - due.getDay() + 7) % 7 || 7;
      due.setDate(due.getDate() + delta);
    }
    due.setHours(18, 0, 0, 0); // EOD default
    dueAt = due.toISOString();
  }

  // Clean title
  const cleanTitle = text
    .replace(/#([a-zA-Z0-9_-]+)/g, "")
    .replace(/\+([a-zA-Z0-9_-]+)/g, "")
    .replace(/\b\d+\s*(m|min|mins|h|hr|hrs)\b/i, "")
    .replace(/@(tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: cleanTitle,
    tags,
    project,
    estimatedMinutes,
    dueAt,
  };
}

export function QuickCapture() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Global Keyboard shortcut: 'Q' or 'Ctrl+K' / 'Cmd+K' to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isTyping = activeTag === "input" || activeTag === "textarea" || (document.activeElement as HTMLElement)?.isContentEditable;

      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key.toLowerCase() === "q" && !isTyping && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }

      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const parsed = parseCapture(value);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!parsed.title) {
      setMessage("Enter a task title.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.title,
          tags: parsed.tags,
          projectName: parsed.project,
          estimatedMinutes: parsed.estimatedMinutes,
          dueAt: parsed.dueAt,
          status: "DRAFT",
          emailEnabled: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Task creation failed.");
        return;
      }

      setValue("");
      setMessage("Task captured!");
      router.refresh();
      setTimeout(() => setMessage(""), 2500);
    } catch {
      setMessage("Unable to capture task. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Quick capture task"
            placeholder="Quick capture: Fix login auth #bug +TASKFLOW 1h @tomorrow (Press 'Q' or 'Ctrl+K')"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-16 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              Q
            </kbd>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {/* Live parsing badges */}
      {value.trim().length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {parsed.title && (
            <span className="text-slate-500 font-medium">
              Title: <span className="text-slate-800">{parsed.title}</span>
            </span>
          )}
          {parsed.project && (
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700">
              +{parsed.project}
            </span>
          )}
          {parsed.tags.map((t) => (
            <span key={t} className="rounded-md bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
              #{t}
            </span>
          ))}
          {parsed.estimatedMinutes && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
              ⏱ {parsed.estimatedMinutes}m
            </span>
          )}
          {parsed.dueAt && (
            <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
              📅 {new Date(parsed.dueAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      )}

      {message && (
        <p className="mt-1 text-xs font-medium text-emerald-600 transition">
          {message}
        </p>
      )}
    </div>
  );
}