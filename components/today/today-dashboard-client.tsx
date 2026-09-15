"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Project {
  id: string;
  name: string;
  color?: string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  estimateMinutes?: number | null;
  actualMinutes?: number | null;
  dueDate?: Date | string | null;
  recurringInterval?: string | null;
  tags?: string[];
  subtasks: Subtask[];
  project?: Project | null;
}

interface DailyStats {
  totalCount: number;
  completedCount: number;
  estimatedMinutes: number;
  actualMinutes: number;
}

interface TodayDashboardProps {
  initialTasks: TaskItem[];
  unplannedTasks: TaskItem[];
  currentUserId: string;
  stats: DailyStats;
}

const PRIORITIES: Record<string, { badge: string; label: string }> = {
  P1: { badge: "text-rose-600 bg-rose-50 border-rose-200", label: "P1" },
  P2: { badge: "text-orange-600 bg-orange-50 border-orange-200", label: "P2" },
  P3: { badge: "text-blue-600 bg-blue-50 border-blue-200", label: "P3" },
  P4: { badge: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "P4" },
  P5: { badge: "text-slate-600 bg-slate-50 border-slate-200", label: "P5" },
  URGENT: { badge: "text-rose-600 bg-rose-50 border-rose-200", label: "P1" },
  HIGH: { badge: "text-orange-600 bg-orange-50 border-orange-200", label: "P2" },
  MEDIUM: { badge: "text-blue-600 bg-blue-50 border-blue-200", label: "P3" },
  LOW: { badge: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "P4" },
};

export function TodayDashboardClient({
  initialTasks = [],
  unplannedTasks = [],
  stats,
}: TodayDashboardProps) {
  const router = useRouter();

  // Active Task & Timer State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(
    initialTasks.find((t) => t.status === "IN_PROGRESS")?.id || null
  );
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // UI Drawers & Filters
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showInboxDrawer, setShowInboxDrawer] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  const activeTask = useMemo(
    () => initialTasks.find((t) => t.id === activeTaskId),
    [initialTasks, activeTaskId]
  );

  // 1. Live Stopwatch Tick for Current Active Task
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

  // 2. Keyboard Shortcuts (Space: Toggle Timer, Escape: Close Drawers)
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
      } else if (e.key === "Escape") {
        setSelectedTask(null);
        setShowInboxDrawer(false);
      } else if (e.key === "i" || e.key === "I") {
        setShowInboxDrawer((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTaskId]);

  // Toggle Timer Handler on Any Task Row
  const handleToggleTaskTimer = (task: TaskItem) => {
    if (activeTaskId === task.id) {
      setIsTimerRunning(!isTimerRunning);
    } else {
      setActiveTaskId(task.id);
      setIsTimerRunning(true);
      setTimerSeconds(0);
    }
  };

  // Toggle Subtask Completion
  const handleToggleSubtask = async (taskId: string, subtaskId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subtaskId, completed: !currentStatus }),
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error("Failed to toggle subtask", err);
    }
  };

  // Quick Stop & Log Session Time
  const handleStopTimer = async () => {
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
      console.error("Failed to log focus time", err);
    }
  };

  // Move Unplanned task into Today
  const handleMoveToToday = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ASSIGNED",
          dueDate: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setShowInboxDrawer(false);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to reschedule task", err);
    }
  };

  // Format Clock Seconds
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const filteredTasks = initialTasks.filter((t) => {
    if (filterPriority === "ALL") return true;
    const norm = t.priority?.toUpperCase();
    if (filterPriority === "URGENT" && (norm === "URGENT" || norm === "P1")) return true;
    if (filterPriority === "HIGH" && (norm === "HIGH" || norm === "P2")) return true;
    if (filterPriority === "MEDIUM" && (norm === "MEDIUM" || norm === "P3")) return true;
    if (filterPriority === "LOW" && (norm === "LOW" || norm === "P4" || norm === "P5")) return true;
    return norm === filterPriority;
  });

  const completionPercentage =
    stats?.totalCount > 0
      ? Math.round((stats.completedCount / stats.totalCount) * 100)
      : 0;

  return (
    <div className="space-y-6 font-sans select-none">
      {/* 📊 1. DAILY PRODUCTIVITY & PROGRESS BAR */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tasks Completed</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats?.completedCount || 0}/{stats?.totalCount || 0}</span>
            <span className="text-xs font-semibold text-emerald-600">({completionPercentage}%)</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Planned Focus</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{Math.round(((stats?.estimatedMinutes || 0) / 60) * 10) / 10}</span>
            <span className="text-xs text-slate-500">hours</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{stats?.estimatedMinutes || 0} total mins est.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Actual Logged</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-purple-600">{Math.round(((stats?.actualMinutes || 0) / 60) * 10) / 10}</span>
            <span className="text-xs text-slate-500">hours</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{stats?.actualMinutes || 0} actual focus mins</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inbox Backlog</span>
            <p className="text-2xl font-black text-slate-900">{unplannedTasks.length}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowInboxDrawer(true)}
            className="text-left text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
          >
            + Triage Unplanned →
          </button>
        </div>
      </div>

      {/* ⏱️ 2. ACTIVE FOCUS TASK & LIVE TIME TRACKER BANNER */}
      {activeTask ? (
        <div className="rounded-[28px] border border-purple-200 bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 p-6 text-white shadow-xl shadow-purple-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 max-w-md">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="rounded-full bg-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                  🎯 Currently Tracking
                </span>
                {activeTask.project && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">
                    {activeTask.project.name}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">{activeTask.title}</h2>
              <p className="text-xs text-purple-200">
                Estimated: {activeTask.estimateMinutes || 0}m • Logged: {(activeTask.actualMinutes || 0) + Math.round(timerSeconds / 60)}m
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white">
                  {formatTimer(timerSeconds)}
                </div>
                <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wider">
                  {isTimerRunning ? "Sprint Active" : "Sprint Paused"}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer ${
                    isTimerRunning ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isTimerRunning ? "⏸ Pause" : "▶ Resume"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopTimer}
                  className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 text-xs py-2 cursor-pointer"
                >
                  ■ Stop & Log
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-4 text-xs text-slate-500">
          <span>No active focus session running. Click the play button next to any deliverable below to start timer.</span>
          <span className="hidden sm:inline font-mono text-[11px] bg-slate-100 px-2 py-1 rounded-md text-slate-600">
            Shortcut: [Space] toggles timer
          </span>
        </div>
      )}

      {/* 🏷️ 3. FILTERS & ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs">
          {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority(p)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                filterPriority === p ? "bg-slate-950 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p === "ALL" ? "All Priority" : p === "URGENT" ? "🔥 Urgent" : p === "HIGH" ? "⚡ High" : p === "MEDIUM" ? "🔷 Medium" : "☕ Low"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInboxDrawer(true)}
            className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
          >
            📥 Backlog Drawer ({unplannedTasks.length})
          </Button>
          <Link href="/tasks">
            <Button size="sm" className="rounded-xl bg-slate-900 text-xs font-semibold text-white cursor-pointer">
              + Create Task
            </Button>
          </Link>
        </div>
      </div>

      {/* 📅 4. SCHEDULED DELIVERABLES LIST (Count Pill Removed + Inline Timers) */}
      <div className="rounded-[30px] border border-white/80 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
        {/* Header Ribbon without Count Badge */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            SCHEDULED DELIVERABLES
          </span>
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>SPENT / ESTIMATE</span>
            <span>PRIORITY</span>
          </div>
        </div>

        {/* Task Rows List with Instant Timer Buttons */}
        <div className="mt-3 divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No scheduled deliverables for today matching this filter.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isTaskActive = task.id === activeTaskId;
              const isCompleted = task.status === "COMPLETED" || task.status === "APPROVED";
              const pConfig = PRIORITIES[task.priority?.toUpperCase()] || PRIORITIES.P3;

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between py-3.5 px-2.5 rounded-2xl transition-all ${
                    isTaskActive
                      ? "bg-purple-50/80 border border-purple-200"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Timer Trigger Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTaskTimer(task)}
                      title={isTaskActive && isTimerRunning ? "Pause Timer" : "Start Focus Timer"}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition cursor-pointer shadow-xs ${
                        isTaskActive && isTimerRunning
                          ? "bg-purple-600 text-white shadow-purple-500/30 animate-pulse"
                          : "bg-slate-100 text-slate-700 hover:bg-purple-600 hover:text-white"
                      }`}
                    >
                      {isTaskActive && isTimerRunning ? (
                        <span className="text-xs font-bold">⏸</span>
                      ) : (
                        <span className="text-xs font-bold pl-0.5">▶</span>
                      )}
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={`truncate text-xs font-black transition hover:text-purple-600 ${
                            isCompleted ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </Link>

                        {isTaskActive && (
                          <span className="rounded-md bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.2 font-mono">
                            {formatTimer(timerSeconds)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                        <span>{task.project ? task.project.name : "Salespipeline"}</span>
                        {task.recurringInterval && (
                          <span className="text-[10px] text-blue-600 font-bold">
                            🔄 {task.recurringInterval}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estimation & Priority Badge */}
                  <div className="flex items-center gap-8 shrink-0">
                    <span className="text-xs font-bold text-slate-500 font-mono">
                      {task.actualMinutes || 0}m / {task.estimateMinutes ? `${task.estimateMinutes}m` : "8h"}
                    </span>

                    <span
                      className={`flex h-7 w-8 items-center justify-center rounded-lg border text-xs font-black ${pConfig.badge}`}
                    >
                      {pConfig.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 📋 5. UNPLANNED / INBOX SLIDE-OVER DRAWER */}
      {showInboxDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white p-6 shadow-2xl space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Unplanned Backlog</h3>
                <p className="text-xs text-slate-500">Pick tasks from the inbox to execute today.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowInboxDrawer(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {unplannedTasks.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Inbox is empty!</p>
              ) : (
                unplannedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:border-slate-300"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-xs font-bold text-slate-800">{t.title}</p>
                      {t.project && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {t.project.name}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleMoveToToday(t.id)}
                      className="rounded-lg bg-slate-900 text-white text-[11px] px-2.5 py-1 h-auto cursor-pointer"
                    >
                      + Add to Today
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 📝 6. TASK DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{selectedTask.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div>
                <span className="font-semibold text-slate-700">Description:</span>
                <p className="mt-1 rounded-xl bg-slate-50 p-3 border border-slate-100 text-slate-800">
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-slate-200 p-2.5">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Estimated Time</span>
                  <span className="font-bold text-slate-800">{selectedTask.estimateMinutes || 0} minutes</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-2.5">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Actual Logged</span>
                  <span className="font-bold text-purple-600">{selectedTask.actualMinutes || 0} minutes</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Link href={`/tasks/${selectedTask.id}`}>
                <Button size="sm" className="rounded-xl bg-slate-900 text-xs text-white cursor-pointer">
                  Open Full Task Page →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}