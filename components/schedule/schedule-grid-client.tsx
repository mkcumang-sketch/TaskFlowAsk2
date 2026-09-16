"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  startAt?: string | Date | null;
  dueAt?: string | Date | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  project?: { id: string; name: string } | null;
}

interface ScheduleGridProps {
  initialScheduledTasks: any[];
  unscheduledTasks: any[];
  currentUserId: string;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 to 20:00 (8 AM - 8 PM)

export function ScheduleGridClient({
  initialScheduledTasks = [],
  unscheduledTasks = [],
  currentUserId,
}: ScheduleGridProps) {
  const router = useRouter();

  // Date selection state
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Current time position
  const [now, setNow] = useState(new Date());
  const [selectedUnscheduledTask, setSelectedUnscheduledTask] = useState<TaskItem | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks that start on the selected date
  const dayTasks = useMemo(() => {
    return initialScheduledTasks.filter((t) => {
      if (!t.startAt) return false;
      const d = new Date(t.startAt).toISOString().split("T")[0];
      return d === selectedDate;
    });
  }, [initialScheduledTasks, selectedDate]);

  // Compute Daily Load Metrics (24-Hour Day Capacity Window)
  const totalScheduledMinutes = dayTasks.reduce(
    (acc, t) => acc + (t.estimatedMinutes || 60),
    0
  );
  const scheduledHours = Math.round((totalScheduledMinutes / 60) * 10) / 10;
  // Available free time based on 24 hour day window
  const freeHours = Math.max(0, Math.round((24 - scheduledHours) * 10) / 10);
  const isOverbooked = scheduledHours > 24;

  // Handle Quick Timebox Slot Click
  const handleSlotClick = async (hour: number) => {
    if (!selectedUnscheduledTask) return;
    setIsAssigning(true);

    try {
      const res = await fetch("/api/schedule/timebox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedUnscheduledTask.id,
          dateStr: selectedDate,
          startHour: hour,
          durationMinutes: selectedUnscheduledTask.estimatedMinutes || 60,
        }),
      });

      if (res.ok) {
        setSelectedUnscheduledTask(null);
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to schedule slot:", err);
    } finally {
      setIsAssigning(false);
    }
  };

  // Live Red Marker Calculation
  const isSelectedDateToday =
    selectedDate === new Date().toISOString().split("T")[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const showCurrentTimeLine =
    isSelectedDateToday && currentHour >= 8 && currentHour <= 20;
  const currentLineTop =
    ((currentHour - 8) * 60 + currentMinute) * (80 / 60); // 80px height per hour slot

  return (
    <div className="w-full space-y-6 font-sans select-none">
      {/* 📊 1. METRICS RIBBON */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Scheduled Work */}
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Scheduled Work
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{scheduledHours}</span>
            <span className="text-xs font-bold text-slate-400">hours</span>
          </div>
          <span className="text-[11px] font-semibold text-purple-600">
            {dayTasks.length} task blocks
          </span>
        </div>

        {/* Available Free Time (Updated to 24-hour cycle) */}
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Available Free Time
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600">
              {scheduledHours === 0 ? 24 : freeHours}
            </span>
            <span className="text-xs font-bold text-slate-400">hours</span>
          </div>
          <span className="text-[11px] text-slate-400">Within 24-hour daily window</span>
        </div>

        {/* Capacity Load */}
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Capacity Load
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-2xl font-black ${isOverbooked ? "text-red-600" : "text-slate-900"}`}>
              {Math.min(100, Math.round((scheduledHours / 24) * 100))}%
            </span>
          </div>
          <span className={`text-[11px] font-bold ${isOverbooked ? "text-red-500" : "text-emerald-600"}`}>
            {isOverbooked ? "⚠️ Overbooked capacity" : "✓ Optimal balance"}
          </span>
        </div>

        {/* Unscheduled Tasks */}
        <div className="rounded-2xl border border-purple-200/80 bg-purple-50/80 p-4 shadow-sm backdrop-blur-md flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">
            Unscheduled Tasks
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-950">{unscheduledTasks.length}</span>
            <span className="text-xs text-purple-700">waiting</span>
          </div>
          <span className="text-[11px] font-bold text-purple-700">Click a task below to timebox</span>
        </div>
      </div>

      {/* 🧭 2. DATE NAVIGATION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            →
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
          />
        </div>

        {selectedUnscheduledTask && (
          <div className="flex items-center gap-2 rounded-xl bg-purple-100 px-3 py-1 text-xs font-bold text-purple-900 animate-pulse">
            <span>Click any hour on the grid to drop:</span>
            <span className="underline truncate max-w-[200px]">{selectedUnscheduledTask.title}</span>
            <button
              type="button"
              onClick={() => setSelectedUnscheduledTask(null)}
              className="ml-1 text-purple-500 hover:text-purple-800 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 🕒 3. SPLIT WORKSPACE: TIME GRID + UNSCHEDULED PANEL */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* TIME GRID (Col 8) */}
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xl backdrop-blur-xl lg:col-span-8">
          <div className="relative divide-y divide-slate-100">
            {/* Live Current Time Red Marker */}
            {showCurrentTimeLine && (
              <div
                className="absolute left-16 right-0 z-30 flex items-center pointer-events-none transition-all duration-500"
                style={{ top: `${currentLineTop}px` }}
              >
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 ring-4 ring-red-100" />
                <div className="h-0.5 flex-1 bg-red-500 shadow-sm" />
              </div>
            )}

            {HOURS.map((hour) => {
              const slotTasks = dayTasks.filter((t) => {
                const h = new Date(t.startAt).getHours();
                return h === hour;
              });

              return (
                <div
                  key={hour}
                  onClick={() => handleSlotClick(hour)}
                  className={`group relative flex min-h-[80px] cursor-pointer transition-colors ${
                    selectedUnscheduledTask ? "hover:bg-purple-50/50" : "hover:bg-slate-50/60"
                  }`}
                >
                  {/* Time Label */}
                  <div className="w-16 shrink-0 pt-2 text-xs font-black text-slate-400 font-mono select-none">
                    {String(hour).padStart(2, "0")}:00
                  </div>

                  {/* Hourly Work Container */}
                  <div className="flex-1 p-1.5 space-y-2">
                    {slotTasks.map((task) => {
                      const duration = task.estimatedMinutes || 60;
                      return (
                        <div
                          key={task.id}
                          className="rounded-2xl border border-purple-200/90 bg-gradient-to-r from-purple-50 via-white to-indigo-50 p-3 shadow-xs transition-all hover:border-purple-400 hover:shadow-md"
                          style={{ minHeight: `${Math.max(50, Math.min(180, (duration / 60) * 70))}px` }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900 truncate">{task.title}</span>
                            <span className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-700 shadow-xs">
                              ⏱ {duration}m
                            </span>
                          </div>
                          {task.project && (
                            <span className="mt-1 inline-block text-[10px] font-semibold text-purple-600">
                              📁 {task.project.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* UNSCHEDULED CANDIDATES (Col 4) */}
        <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-xl backdrop-blur-xl lg:col-span-4 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">📋 Unscheduled Work</h3>
            <p className="text-xs text-slate-500">Pick a task to place it on the time grid.</p>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-kanban-scroll">
            {unscheduledTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">Backlog is empty!</div>
            ) : (
              unscheduledTasks.map((task) => {
                const isSelected = selectedUnscheduledTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedUnscheduledTask(isSelected ? null : task)}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-50/80 shadow-sm ring-2 ring-purple-100"
                        : "border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{task.title}</h4>
                      <span className="shrink-0 rounded px-1 text-[9px] font-black uppercase bg-slate-200 text-slate-700">
                        {task.priority}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>⏱ {task.estimatedMinutes || 60}m</span>
                      {task.project && <span className="text-purple-600 font-semibold">{task.project.name}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}n