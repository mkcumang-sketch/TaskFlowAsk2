"use client";

import { useEffect, useRef, useState } from "react";

interface PomodoroTimerProps {
  taskId?: string;
  onSessionComplete?: (minutes: number) => void;
}

export function PomodoroTimer({ taskId, onSessionComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleFinish();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleFinish = async () => {
    setIsRunning(false);
    if (mode === "focus") {
      // 25 minutes logged
      if (taskId) {
        try {
          await fetch(`/api/tasks/${taskId}/time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutes: 25, note: "Pomodoro focus block" }),
          });
        } catch (e) {
          console.error("Failed to auto-log pomodoro", e);
        }
      }
      onSessionComplete?.(25);
      setMode("break");
      setTimeLeft(5 * 60);
    } else {
      setMode("focus");
      setTimeLeft(25 * 60);
    }
  };

  const toggleTimer = () => setIsRunning((prev) => !prev);

  const resetTimer = (newMode: "focus" | "break" = mode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(newMode === "focus" ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {mode === "focus" ? "🎯 Focus Session" : "☕ Short Break"}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => resetTimer("focus")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              mode === "focus" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            25m Focus
          </button>
          <button
            onClick={() => resetTimer("break")}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
              mode === "break" ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            5m Break
          </button>
        </div>
      </div>

      <div className="my-5 text-center">
        <span className="font-mono text-4xl font-black tracking-tight text-slate-900">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={toggleTimer}
          className={`w-28 rounded-xl py-2 text-xs font-bold text-white transition ${
            isRunning ? "bg-amber-600 hover:bg-amber-500" : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => resetTimer()}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}