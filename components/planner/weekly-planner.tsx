"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  priority: string;
  dueAt?: string | Date | null;
  estimatedMinutes?: number | null;
  status: string;
  project?: { name: string } | null;
}

interface WeeklyPlannerProps {
  initialTasks?: TaskItem[];
  currentUserId?: string;
}

const DAYS_OF_WEEK = [
  { short: "MON", num: "07", full: "Monday", dateStr: "2026-09-07" },
  { short: "TUE", num: "08", full: "Tuesday", dateStr: "2026-09-08" },
  { short: "WED", num: "09", full: "Wednesday", dateStr: "2026-09-09" },
  { short: "THU", num: "10", full: "Thursday", dateStr: "2026-09-10", isToday: true },
  { short: "FRI", num: "11", full: "Friday", dateStr: "2026-09-11" },
  { short: "SAT", num: "12", full: "Saturday", dateStr: "2026-09-12" },
  { short: "SUN", num: "13", full: "Sunday", dateStr: "2026-09-13" },
];

export function WeeklyPlanner({ initialTasks = [] }: WeeklyPlannerProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<"WEEK" | "DAY" | "CAPACITY">("WEEK");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [targetDay, setTargetDay] = useState<string | null>(null);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [, startTransition] = useTransition();

  // Helper to match tasks to days based on dueAt
  const getTasksForDay = (dateStr: string) => {
    return tasks.filter((t) => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt).toISOString().split("T")[0];
      return d === dateStr;
    });
  };

  const unscheduledTasks = tasks.filter((t) => !t.dueAt);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, dayStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (targetDay !== dayStr) setTargetDay(dayStr);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setTargetDay(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const previous = [...tasks];
    const newDueDate = new Date(`${dateStr}T17:00:00Z`);

    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueAt: newDueDate } : t))
    );
    setDraggedTaskId(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: newDueDate.toISOString() }),
      });

      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setTasks(previous);
    }
  };

  return (
    <div className="w-full space-y-6 select-none font-sans">
      {/* 🧭 Header Controls & Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-slate-200/70 bg-white/80 p-3.5 shadow-sm backdrop-blur-xl">
        {/* Navigation Mode Pills */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("WEEK")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeTab === "WEEK"
                ? "bg-slate-950 text-white shadow-md shadow-slate-950/20 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🗓️</span> My Week
          </button>
          <button
            onClick={() => setActiveTab("DAY")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeTab === "DAY"
                ? "bg-slate-950 text-white shadow-md shadow-slate-950/20 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>☀️</span> Day Agenda
          </button>
          <button
            onClick={() => setActiveTab("CAPACITY")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
              activeTab === "CAPACITY"
                ? "bg-slate-950 text-white shadow-md shadow-slate-950/20 scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>👥</span> Team Capacity
          </button>
        </div>

        {/* Date Jump & Unscheduled Drawer Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <button className="text-slate-400 hover:text-slate-900 text-xs font-black transition">
              ←
            </button>
            <span className="text-xs font-black tracking-tight text-slate-800">
              Sep 07 – Sep 13, 2026
            </span>
            <button className="text-slate-400 hover:text-slate-900 text-xs font-black transition">
              →
            </button>
          </div>

          <Button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            variant="outline"
            className={`rounded-2xl text-xs font-black transition-all cursor-pointer border ${
              showUnscheduled
                ? "border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-300"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            📦 Unscheduled ({unscheduledTasks.length})
          </Button>
        </div>
      </div>

      {/* 📦 Sliding Unscheduled Staging Area */}
      {showUnscheduled && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-200 rounded-[28px] border-2 border-dashed border-purple-300 bg-purple-50/50 p-4">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-purple-900">
              Unscheduled Task Backlog (Drag into any day below)
            </span>
            <span className="text-[11px] font-bold text-purple-600">
              {unscheduledTasks.length} tasks needing allocation
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            {unscheduledTasks.length === 0 ? (
              <span className="text-xs font-medium text-purple-400 py-3">
                All tasks are scheduled for the week!
              </span>
            ) : (
              unscheduledTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="flex items-center gap-2.5 rounded-2xl border border-purple-200 bg-white px-4 py-2.5 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition"
                >
                  <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                    {task.priority || "P3"}
                  </span>
                  <span className="text-xs font-black text-slate-800">{task.title}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ▦ 7-Day Precision Grid */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 items-start">
        {DAYS_OF_WEEK.map((day) => {
          const dayTasks = getTasksForDay(day.dateStr);
          const isTarget = targetDay === day.dateStr;
          const totalMinutes = dayTasks.reduce(
            (acc, t) => acc + (t.estimatedMinutes || 60),
            0
          );
          const plannedHours = (totalMinutes / 60).toFixed(1).replace(".0", "");
          const capacityPercent = Math.min(Math.round((totalMinutes / 480) * 100), 100);

          return (
            <div
              key={day.dateStr}
              onDragOver={(e) => handleDragOver(e, day.dateStr)}
              onDrop={(e) => handleDrop(e, day.dateStr)}
              className={`group flex flex-col min-h-[580px] rounded-[30px] p-3.5 transition-all duration-200 relative ${
                day.isToday
                  ? "border-2 border-purple-500/90 bg-gradient-to-b from-purple-50/70 via-white to-white shadow-xl ring-4 ring-purple-400/20"
                  : "border border-slate-200/90 bg-white/90 shadow-sm hover:border-slate-300 hover:shadow-md"
              } ${isTarget ? "ring-4 ring-indigo-400 bg-indigo-50/60 scale-[1.02]" : ""}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-[11px] font-black tracking-widest text-slate-400">
                  {day.short}
                </span>

                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-2xl text-xs font-black transition ${
                    day.isToday
                      ? "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 scale-110"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {day.num}
                </span>
              </div>

              {/* Progress Capacity Bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-400 font-mono">
                  <span>{plannedHours}h planned</span>
                  <span>{capacityPercent}%</span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${capacityPercent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      capacityPercent > 80
                        ? "bg-rose-500"
                        : day.isToday
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>

              {/* Day Tasks List */}
              <div className="mt-4 flex-1 space-y-2.5">
                {dayTasks.length === 0 ? (
                  <div
                    className={`flex h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all text-center p-3 ${
                      isTarget
                        ? "border-purple-400 bg-purple-100/50 text-purple-700 font-black text-xs scale-95"
                        : "border-slate-100 bg-slate-50/40 text-slate-300 text-[11px]"
                    }`}
                  >
                    {isTarget ? (
                      "Drop to schedule here"
                    ) : (
                      <>
                        <span className="text-lg opacity-40">☕</span>
                        <span className="mt-1 font-semibold">No tasks scheduled</span>
                      </>
                    )}
                  </div>
                ) : (
                  dayTasks.map((t) => {
                    const isBeingDragged = draggedTaskId === t.id;

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        className={`group/card relative rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:border-purple-300 hover:shadow-md ${
                          isBeingDragged ? "opacity-30 scale-95 ring-2 ring-purple-400" : ""
                        }`}
                      >
                        {/* Top Indicator */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white shadow-2xs ${
                              t.priority === "P1"
                                ? "bg-rose-500"
                                : t.priority === "P2"
                                ? "bg-orange-500"
                                : "bg-purple-600"
                            }`}
                          >
                            {t.priority || "P3"}
                          </span>

                          {t.project && (
                            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px]">
                              {t.project.name}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="mt-2 text-xs font-black text-slate-900 leading-snug line-clamp-2">
                          {t.title}
                        </h4>

                        {/* Duration Footer */}
                        <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-slate-400 font-mono">
                          <span>⏱️ {t.estimatedMinutes || 60}m</span>
                          <span className="text-purple-600 opacity-0 group-hover/card:opacity-100 transition-opacity">
                            Drag ⠿
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}