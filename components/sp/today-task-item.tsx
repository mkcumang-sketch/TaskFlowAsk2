"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TaskItemProps {
  task: any;
  currentUserId: string;
}

export function TodayTaskItem({ task, currentUserId }: TaskItemProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [actualMinutes, setActualMinutes] = useState(task.actualMinutes || 0);
  const [loading, setLoading] = useState(false);

  const formatClock = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m`;
  };

  const toggleTimer = async () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
      const updated = actualMinutes + 1;
      setActualMinutes(updated);

      await fetch(`/api/tasks/${task.id}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: 1 }),
      });
      router.refresh();
    }
  };

  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    setLoading(true);
    try {
      await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subtaskId, completed: !completed }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "P1":
        return "bg-red-50 text-red-700 border-red-200";
      case "P2":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "P3":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "P4":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="group transition hover:bg-slate-50/80">
      {/* Primary Task Bar */}
      <div className="flex items-center justify-between px-5 py-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Collapse/Expand chevron if subtasks exist */}
          {task.subtasks && task.subtasks.length > 0 ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-slate-700 font-mono text-xs w-4"
            >
              {expanded ? "▼" : "▶"}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Quick Play Timer */}
          <button
            onClick={toggleTimer}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold transition ${
              isRunning
                ? "border-red-500 bg-red-500 text-white animate-pulse"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-900"
            }`}
            title={isRunning ? "Pause Tracking" : "Start Focus Tracking"}
          >
            {isRunning ? "■" : "▶"}
          </button>

          {/* Title and Project Tags */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/tasks/${task.id}`}
                className="truncate text-xs font-semibold text-slate-900 hover:text-blue-600 transition"
              >
                {task.title}
              </Link>
              {task.project && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-bold text-slate-600 uppercase tracking-tight">
                  {task.project.name}
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-2xs text-slate-400 truncate mt-0.5">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Metric Indicators */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1 font-mono text-xs text-slate-600">
            <span className={isRunning ? "font-bold text-emerald-600" : ""}>
              {formatClock(actualMinutes)}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400">{formatClock(task.estimatedMinutes || 0)}</span>
          </div>

          <span
            className={`rounded-md border px-2 py-0.5 text-2xs font-bold font-mono ${getPriorityStyle(
              task.priority
            )}`}
          >
            {task.priority || "P2"}
          </span>
        </div>
      </div>

      {/* Nested Subtask Tree (Super Productivity Architecture) */}
      {expanded && task.subtasks && task.subtasks.length > 0 && (
        <div className="bg-slate-50/50 border-t border-slate-100 px-12 py-2 space-y-1.5">
          {task.subtasks.map((subtask: any) => (
            <div
              key={subtask.id}
              className="flex items-center justify-between text-xs py-1"
            >
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  disabled={loading}
                  onChange={() => toggleSubtask(subtask.id, subtask.completed)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
                />
                <span
                  className={`text-2xs font-medium ${
                    subtask.completed ? "line-through text-slate-400" : "text-slate-800"
                  }`}
                >
                  {subtask.title}
                </span>
              </label>

              {subtask.description && (
                <span className="text-2xs text-slate-400 truncate max-w-xs">
                  {subtask.description}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}