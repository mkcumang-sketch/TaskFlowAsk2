"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TodayTaskItem } from "@/components/sp/today-task-item";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  dueAt?: Date | string | null;
  recurringInterval?: string | null;
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
  project?: { id: string; name: string } | null;
  assignees: Array<{ user: { id: string; name: string | null; email: string } }>;
}

interface HabitItem {
  id: string;
  name: string;
}

interface TodayCockpitProps {
  initialTasks: any[];
  unplannedTasks: any[];
  habits: HabitItem[];
  completedHabitIds: string[];
  currentUserId: string;
  metrics: {
    totalEstimate: number;
    totalSpent: number;
    remainingMinutes: number;
  };
}

export function TodayCockpit({
  initialTasks,
  unplannedTasks,
  habits,
  completedHabitIds,
  currentUserId,
  metrics,
}: TodayCockpitProps) {
  const router = useRouter();

  const [activeTaskId, setActiveTaskId] = useState<string | null>(
    initialTasks.find((t) => t.status === "IN_PROGRESS")?.id || null
  );
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [showInboxDrawer, setShowInboxDrawer] = useState(false);

  const activeTask = useMemo(
    () => initialTasks.find((t) => t.id === activeTaskId),
    [initialTasks, activeTaskId]
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && activeTaskId) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, activeTaskId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && activeTaskId) {
        e.preventDefault();
        setIsTimerRunning((prev) => !prev);
      } else if (e.key === "i" || e.key === "I") {
        setShowInboxDrawer((prev) => !prev);
      } else if (e.key === "Escape") {
        setShowInboxDrawer(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTaskId]);

  const handleStopAndSave = async () => {
    if (!activeTaskId) return;
    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));

    try {
      await fetch(`/api/tasks/${activeTaskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes,
          note: "Today Focus Session",
        }),
      });
      setIsTimerRunning(false);
      setTimerSeconds(0);
      router.refresh();
    } catch (err) {
      console.error("Timer log failed", err);
    }
  };

  const handleTriageToToday = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ASSIGNED",
          dueAt: new Date().toISOString(),
        }),
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error("Triage failed", err);
    }
  };

  const formatClock = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const filteredTasks = initialTasks.filter((t) => {
    if (priorityFilter === "ALL") return true;
    return t.priority === priorityFilter;
  });

  const completedCount = initialTasks.filter(
    (t) => t.status === "COMPLETED" || t.status === "APPROVED"
  ).length;
  const progressPct =
    initialTasks.length > 0
      ? Math.min(100, Math.round((completedCount / initialTasks.length) * 100))
      : 0;

  return (
    <div className="relative w-full space-y-7">
      {/* 🌌 Smooth Glowing Ambient Lighting */}
      <div className="pointer-events-none absolute -top-16 left-1/4 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute top-64 -right-10 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl animate-float-delayed" />

      {/* 📊 1. FULL-WIDTH HERO METRIC CARDS (Responsive 1-col to 4-col) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1 */}
        <div className="group relative overflow-hidden rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
              Execution Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100/90 text-emerald-800 text-sm shadow-inner group-hover:scale-110 transition-transform">
              ⚡
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              {completedCount}
              <span className="text-xl font-bold text-slate-400">/{initialTasks.length}</span>
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-700">
              {progressPct}%
            </span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 shadow-sm transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="group relative overflow-hidden rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
              Target Quota
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100/90 text-indigo-800 text-sm shadow-inner group-hover:scale-110 transition-transform">
              ⏱
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-indigo-950">
              {Math.round((metrics.totalEstimate / 60) * 10) / 10}
            </span>
            <span className="text-xs font-bold text-indigo-500">hours</span>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-slate-400">
            {metrics.totalEstimate} mins planned for today
          </p>
        </div>

        {/* Metric 3 */}
        <div className="group relative overflow-hidden rounded-[26px] border border-white/80 bg-white/90 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
              Focused Time
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100/90 text-purple-800 text-sm shadow-inner group-hover:scale-110 transition-transform">
              🔥
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-3xl sm:text-4xl font-black tracking-tight text-transparent">
              {Math.round((metrics.totalSpent / 60) * 10) / 10}
            </span>
            <span className="text-xs font-bold text-purple-500">hours</span>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-slate-400">
            {metrics.totalSpent} mins actively tracked
          </p>
        </div>

        {/* Metric 4 */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-purple-200/80 bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/80 p-5 shadow-lg shadow-purple-500/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-purple-300">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-widest text-purple-700 uppercase">
                Inbox Backlog
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-200/70 text-purple-800 text-sm shadow-inner group-hover:scale-110 transition-transform">
                📥
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-purple-950">
                {unplannedTasks.length}
              </span>
              <span className="text-xs font-bold text-purple-600">tasks waiting</span>
            </div>
          </div>
          <button
            onClick={() => setShowInboxDrawer(true)}
            className="mt-3 inline-flex items-center justify-between rounded-xl bg-purple-100/90 px-3 py-1.5 text-xs font-bold text-purple-800 transition hover:bg-purple-200 active:scale-95"
          >
            <span>Triage List</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-mono shadow-xs">[I]</span>
          </button>
        </div>
      </div>

      {/* ⏱️ 2. ACTIVE LIVE FOCUS BANNER */}
      {activeTask ? (
        <div className="relative overflow-hidden rounded-[30px] border border-purple-500/30 bg-gradient-to-r from-slate-950 via-purple-950 to-slate-900 p-6 sm:p-7 text-white shadow-2xl shadow-purple-950/30">
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/20 blur-2xl animate-pulse-glow" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/20 px-3.5 py-1 text-[11px] font-black tracking-wider text-purple-200 uppercase shadow-inner">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  Live Focus Sprint
                </span>
                {activeTask.project && (
                  <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-semibold text-slate-300 backdrop-blur-md">
                    {activeTask.project.name}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
                {activeTask.title}
              </h2>

              <p className="text-xs text-purple-200/80 font-mono">
                Planned: {activeTask.estimatedMinutes || 0}m • Current Workload:{" "}
                <span className="font-bold text-emerald-300">
                  {(activeTask.actualMinutes || 0) + Math.round(timerSeconds / 60)}m
                </span>
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-center backdrop-blur-md shadow-inner">
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {formatClock(timerSeconds)}
                </div>
                <span className="text-[10px] font-black tracking-widest uppercase text-purple-300">
                  {isTimerRunning ? "Clock Running" : "Sprint Paused"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`min-h-[42px] rounded-xl px-5 py-2 text-xs font-black tracking-wider text-white shadow-lg transition-all active:scale-95 cursor-pointer ${
                    isTimerRunning
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600"
                  }`}
                >
                  {isTimerRunning ? "⏸ PAUSE" : "▶ RESUME"}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopAndSave}
                  className="min-h-[38px] rounded-xl border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/20 active:scale-95 cursor-pointer"
                >
                  ■ Stop & Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-[26px] border border-purple-200/70 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/80 px-6 py-4 text-xs font-medium text-purple-900 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-base shadow-inner">
              ✨
            </div>
            <div>
              <span className="font-bold text-slate-800 text-sm">Ready to enter flow state?</span>
              <p className="text-slate-500 text-xs">Click the play button on any task below to launch your focus session.</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-purple-700 shadow-xs">
            [Space] = Pause/Resume
          </span>
        </div>
      )}

      {/* 🌱 3. HABIT ROUTINES */}
      {habits.length > 0 && (
        <div className="rounded-[28px] border border-white/80 bg-white/80 p-5 shadow-xl shadow-slate-200/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="text-base">🌱</span>
              <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                Daily Routines & Streaks
              </span>
            </div>
            <span className="rounded-full bg-emerald-100/80 px-3 py-0.5 text-xs font-black font-mono text-emerald-800 shadow-xs">
              {completedHabitIds.length} / {habits.length} ACCOMPLISHED
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {habits.map((habit) => {
              const isDone = completedHabitIds.includes(habit.id);
              return (
                <div
                  key={habit.id}
                  className={`inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2 text-xs font-bold transition-all duration-200 ${
                    isDone
                      ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-950 shadow-sm"
                      : "border-slate-200/80 bg-slate-50/90 text-slate-700 hover:bg-white"
                  }`}
                >
                  <span>{habit.name}</span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                      isDone ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isDone ? "✓" : "○"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🏷️ 4. PRIORITY PILLS & CREATE TASK ACTION */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/80 bg-slate-200/50 p-1.5 backdrop-blur-md shadow-inner">
          {[
            { key: "ALL", label: "All Priority" },
            { key: "URGENT", label: "🔥 Urgent" },
            { key: "HIGH", label: "⚡ High" },
            { key: "MEDIUM", label: "🔹 Medium" },
            { key: "LOW", label: "☕ Low" },
          ].map((p) => {
            const active = priorityFilter === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setPriorityFilter(p.key)}
                className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all active:scale-95 ${
                  active
                    ? "bg-white text-slate-900 shadow-md shadow-slate-300/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInboxDrawer(true)}
            className="rounded-2xl border-purple-200 bg-purple-50/80 text-xs font-bold text-purple-800 hover:bg-purple-100 shadow-xs"
          >
            📥 Backlog Drawer ({unplannedTasks.length})
          </Button>

          <Link href="/tasks">
            <Button
              size="sm"
              className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-xs font-black text-white shadow-lg shadow-slate-900/20 hover:shadow-indigo-900/30 transition active:scale-95"
            >
              + Create Task
            </Button>
          </Link>
        </div>
      </div>

      {/* 📋 5. FULL-WIDTH SCHEDULED DELIVERABLES CONTAINER */}
      <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/90 shadow-2xl shadow-slate-200/50 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
              Scheduled Deliverables
            </span>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-extrabold font-mono text-purple-700 shadow-inner">
              {filteredTasks.length}
            </span>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-black tracking-widest text-slate-400 font-mono uppercase">
            <span>Spent / Estimate</span>
            <span>Priority</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-100 text-2xl shadow-inner">
                ☕
              </div>
              <p className="font-bold text-slate-700 text-sm">All scheduled tasks completed!</p>
              <p className="mt-1 text-slate-400">
                Press <kbd className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600 shadow-xs">[I]</kbd> to pull new tasks from your inbox.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="group relative transition-all duration-200 hover:bg-slate-50/90 hover:pl-1"
              >
                <TodayTaskItem task={task} currentUserId={currentUserId} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* 📥 6. SLIDE-OVER INBOX TRIAGE DRAWER */}
      {showInboxDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-md bg-white/95 p-6 shadow-2xl space-y-4 overflow-y-auto border-l border-slate-100 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  📥 Unplanned Backlog
                </h3>
                <p className="text-xs text-slate-500">
                  Select and schedule tasks directly into today&apos;s sprint.
                </p>
              </div>
              <button
                onClick={() => setShowInboxDrawer(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {unplannedTasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Inbox backlog is completely clear!
                </div>
              ) : (
                unplannedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-xs transition-all duration-200 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="truncate text-xs font-black text-slate-900">{t.title}</p>
                      {t.project && (
                        <span className="mt-1 inline-block rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          {t.project.name}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleTriageToToday(t.id)}
                      className="rounded-xl bg-slate-900 text-white text-xs font-bold px-3 py-1.5 h-auto transition active:scale-95 hover:bg-purple-700 cursor-pointer shadow-xs"
                    >
                      + Today
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}