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

export function TodayDashboardClient({
  initialTasks,
  unplannedTasks,
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

  // 2. Keyboard Shortcuts (Space: Toggle Timer, N: New Task, Escape: Close Drawers)
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
    return t.priority === filterPriority;
  });

  const completionPercentage = stats.totalCount > 0
    ? Math.round((stats.completedCount / stats.totalCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* 📊 1. DAILY PRODUCTIVITY & PROGRESS BAR */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tasks Completed</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.completedCount}/{stats.totalCount}</span>
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
            <span className="text-2xl font-black text-slate-900">{Math.round(stats.estimatedMinutes / 60 * 10) / 10}</span>
            <span className="text-xs text-slate-500">hours</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{stats.estimatedMinutes} total mins est.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Actual Logged</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-black text-purple-600">{Math.round(stats.actualMinutes / 60 * 10) / 10}</span>
            <span className="text-xs text-slate-500">hours</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{stats.actualMinutes} actual focus mins</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Inbox Backlog</span>
            <p className="text-2xl font-black text-slate-900">{unplannedTasks.length}</p>
          </div>
          <button
            onClick={() => setShowInboxDrawer(true)}
            className="text-left text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            + Triage Unplanned →
          </button>
        </div>
      </div>

      {/* ⏱️ 2. ACTIVE FOCUS TASK & LIVE TIME TRACKER BANNER */}
      {activeTask ? (
        <div className="rounded-3xl border border-purple-200 bg-gradient-to-r from-purple-900 to-indigo-900 p-5 text-white shadow-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-purple-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                  🎯 Currently Tracking
                </span>
                {activeTask.project && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">
                    {activeTask.project.name}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">{activeTask.title}</h2>
              <p className="text-xs text-purple-200">
                Estimated: {activeTask.estimateMinutes || 0}m • Logged: {(activeTask.actualMinutes || 0) + Math.round(timerSeconds / 60)}m
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-white">
                {formatTimer(timerSeconds)}
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
          <span>No active focus session running. Select any task below to initiate live tracking.</span>
          <span className="hidden sm:inline font-mono text-[11px] bg-slate-100 px-2 py-1 rounded-md text-slate-600">
            Shortcut: [Space] toggles timer
          </span>
        </div>
      )}

      {/* 🏷️ 3. FILTERS, SEARCH & SHORTCUT GUIDE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-200/60 p-1">
          {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                filterPriority === p ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInboxDrawer(true)}
            className="rounded-xl border-slate-200 text-xs font-semibold text-slate-700"
          >
            📥 Unplanned Inbox ({unplannedTasks.length})
          </Button>
          <Link href="/tasks">
            <Button size="sm" className="rounded-xl bg-slate-900 text-xs font-semibold text-white">
              + New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* 📅 4. TODAY'S TASK EXECUTION TIMELINE */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            No scheduled tasks for today matching this priority filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isTaskActive = task.id === activeTaskId;
            const isCompleted = task.status === "COMPLETED" || task.status === "APPROVED";

            return (
              <div
                key={task.id}
                className={`group rounded-2xl border bg-white p-4 shadow-xs transition-all ${
                  isTaskActive
                    ? "border-purple-500 ring-2 ring-purple-100"
                    : isCompleted
                    ? "border-slate-100 bg-slate-50/60 opacity-70"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Select for Live Timer Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isTaskActive) {
                          setIsTimerRunning(!isTimerRunning);
                        } else {
                          setActiveTaskId(task.id);
                          setIsTimerRunning(true);
                          setTimerSeconds(0);
                        }
                      }}
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                        isTaskActive
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title="Set as Active Focus Task"
                    >
                      {isTaskActive && isTimerRunning ? "⏸" : "▶"}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className={`truncate text-sm font-bold transition hover:text-purple-600 ${
                            isCompleted ? "line-through text-slate-400" : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </Link>

                        {/* Project Tag */}
                        {task.project && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {task.project.name}
                          </span>
                        )}

                        {/* Recurring Badge */}
                        {task.recurringInterval && (
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            🔄 {task.recurringInterval}
                          </span>
                        )}

                        {/* Priority Pill */}
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                            task.priority === "URGENT"
                              ? "bg-red-100 text-red-700"
                              : task.priority === "HIGH"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {task.description && (
                        <p className="line-clamp-1 text-xs text-slate-500">{task.description}</p>
                      )}

                      {/* Subtasks Progress Bar & Checklist */}
                      {task.subtasks.length > 0 && (
                        <div className="pt-1.5 space-y-1">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                            <span>Subtasks: {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {task.subtasks.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleToggleSubtask(task.id, sub.id, sub.completed)}
                                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] transition ${
                                  sub.completed
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 line-through"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                <span>{sub.completed ? "✓" : "○"}</span>
                                <span>{sub.title}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estimation vs Actual Minutes Pill */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-800">{task.actualMinutes || 0}m</span>
                      <span className="text-slate-400"> / {task.estimateMinutes || 0}m</span>
                    </div>
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Quick details & notes"
                    >
                      📝
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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
                onClick={() => setShowInboxDrawer(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 text-sm"
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
                      className="rounded-lg bg-slate-900 text-white text-[11px] px-2.5 py-1 h-auto"
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

      {/* 📝 6. TASK DETAIL & QUICK NOTES MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{selectedTask.title}</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
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
                <Button size="sm" className="rounded-xl bg-slate-900 text-xs text-white">
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