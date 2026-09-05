"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface TaskTimerProps {
  taskId: string;
  initialActualMinutes?: number | null;
}

export function TaskTimer({ taskId, initialActualMinutes = 0 }: TaskTimerProps) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [note, setNote] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStopAndSave = async () => {
    const recordedMinutes = Math.max(1, Math.round(seconds / 60));
    setSaving(true);

    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: recordedMinutes,
          note: note.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsActive(false);
        setIsPaused(false);
        setSeconds(0);
        setNote("");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to save tracked time", err);
    } finally {
      setSaving(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: mins,
          note: note.trim() || "Manual entry",
        }),
      });

      if (res.ok) {
        setManualMinutes("");
        setNote("");
        setShowManual(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to add manual time", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Time Tracking
        </span>
        <span className="text-xs font-medium text-slate-600">
          Total Logged: <strong className="text-slate-900">{initialActualMinutes || 0}m</strong>
        </span>
      </div>

      {/* Stopwatch Counter */}
      <div className="my-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black font-mono tracking-tight text-slate-800">
            ⏱ {formatTime(seconds)}
          </span>
          {isActive && (
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                isPaused ? "bg-amber-400" : "bg-emerald-500 animate-ping"
              }`}
            />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Start
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={handlePause}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Resume
                </button>
              )}
              <button
                onClick={handleStopAndSave}
                disabled={saving}
                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Stop & Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Optional Note while timer is running */}
      {isActive && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Session note (optional)..."
          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-slate-800"
        />
      )}

      {/* Manual Entry Toggle */}
      <div className="mt-3 border-t border-slate-100 pt-2">
        {!showManual ? (
          <button
            onClick={() => setShowManual(true)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 transition"
          >
            + Add manual time
          </button>
        ) : (
          <form onSubmit={handleManualSubmit} className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                required
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="Minutes (e.g. 45)"
                className="w-32 rounded-lg border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-slate-800"
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What did you work on?"
                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-slate-800"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Logging..." : "Log Time"}
              </button>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}