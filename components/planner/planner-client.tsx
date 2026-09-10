"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  dueAt?: string | null;
  estimatedMinutes?: number | null;
  status: string;
  project?: { id: string; name: string } | null;
  assignees?: Array<{
    user: { id: string; name: string | null; email: string; avatarUrl?: string | null };
  }>;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  role?: { name: string } | null;
  department?: { name: string } | null;
}

interface ProjectItem {
  id: string;
  name: string;
  deadline?: string | null;
}

interface PlannerClientProps {
  initialTasks: TaskItem[];
  unplannedTasks: TaskItem[];
  teamMembers: TeamMember[];
  projects: ProjectItem[];
  currentUserId: string;
}

const PRIORITY_THEMES: Record<string, { bg: string; text: string; glow: string }> = {
  P1: { bg: "bg-rose-500", text: "text-white", glow: "shadow-rose-500/40" },
  P2: { bg: "bg-amber-500", text: "text-white", glow: "shadow-amber-500/40" },
  P3: { bg: "bg-indigo-600", text: "text-white", glow: "shadow-indigo-500/40" },
  P4: { bg: "bg-blue-600", text: "text-white", glow: "shadow-blue-500/40" },
  P5: { bg: "bg-slate-600", text: "text-white", glow: "shadow-slate-500/40" },
};

export function PlannerClient({
  initialTasks = [],
  unplannedTasks: initialUnplanned = [],
  teamMembers = [],
  projects = [],
  currentUserId,
}: PlannerClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"WEEK" | "DAY" | "CAPACITY">("WEEK");
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [unplanned, setUnplanned] = useState<TaskItem[]>(initialUnplanned);
  const [showBacklog, setShowBacklog] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<string | null>(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate current viewing week
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + selectedDayOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const isToday =
        new Date().toISOString().split("T")[0] === d.toISOString().split("T")[0];

      days.push({
        name: dayNames[i],
        dateStr: d.toISOString().split("T")[0],
        dayNumber: String(d.getDate()).padStart(2, "0"),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        isToday,
      });
    }
    return days;
  }, [selectedDayOffset]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.project?.name.toLowerCase().includes(q) ||
        t.assignees?.some((a) => a.user.name?.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dropTargetDay !== dateStr) setDropTargetDay(dateStr);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDropTargetDay(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const newDueDate = new Date(`${dateStr}T17:00:00.000Z`).toISOString();

    const prevTasks = [...tasks];
    const prevUnplanned = [...unplanned];

    const movedFromUnplanned = unplanned.find((t) => t.id === taskId);

    if (movedFromUnplanned) {
      setUnplanned((prev) => prev.filter((t) => t.id !== taskId));
      setTasks((prev) => [...prev, { ...movedFromUnplanned, dueAt: newDueDate }]);
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, dueAt: newDueDate } : t))
      );
    }
    setDraggedTaskId(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: newDueDate }),
      });

      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setTasks(prevTasks);
      setUnplanned(prevUnplanned);
    }
  };

  return (
    <div className="w-full space-y-7 font-sans select-none">
      {/* 🧭 High-Impact Command Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-5 rounded-[32px] border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-200/50 backdrop-blur-2xl">
        {/* Navigation Mode Selectors */}
        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5">
          {[
            { id: "WEEK", label: "My Week", icon: "🗓️" },
            { id: "DAY", label: "Day Agenda", icon: "⚡" },
            { id: "CAPACITY", label: "Team Capacity", icon: "👥" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm font-black transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/25 scale-[1.03]"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/80"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Pager & Controls */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 shadow-xs">
            <button
              onClick={() => setSelectedDayOffset((prev) => prev - 1)}
              className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-700 font-black text-sm transition flex items-center justify-center cursor-pointer"
            >
              ←
            </button>
            <span className="px-2 text-sm font-black text-slate-900 tracking-tight">
              {weekDays[0].monthName} {weekDays[0].dayNumber} – {weekDays[6].monthName}{" "}
              {weekDays[6].dayNumber}
            </span>
            <button
              onClick={() => setSelectedDayOffset((prev) => prev + 1)}
              className="h-8 w-8 rounded-xl hover:bg-slate-100 text-slate-700 font-black text-sm transition flex items-center justify-center cursor-pointer"
            >
              →
            </button>
            {selectedDayOffset !== 0 && (
              <button
                onClick={() => setSelectedDayOffset(0)}
                className="ml-1 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-black text-purple-800 hover:bg-purple-200 transition cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          <Button
            onClick={() => setShowBacklog(!showBacklog)}
            variant="outline"
            className={`h-11 rounded-2xl text-sm font-black transition-all cursor-pointer border-2 ${
              showBacklog
                ? "border-purple-600 bg-purple-50 text-purple-900 ring-4 ring-purple-300/40"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
            }`}
          >
            📦 Backlog ({unplanned.length})
          </Button>

          <input
            type="text"
            placeholder="Search tasks, teammates, or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 sm:w-64 h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-purple-600 shadow-xs transition"
          />
        </div>
      </div>

      {/* 📦 Sliding Unscheduled Staging Area */}
      {showBacklog && (
        <div className="rounded-[32px] border-2 border-dashed border-purple-400 bg-gradient-to-r from-purple-50/90 via-indigo-50/60 to-purple-50/90 p-5 shadow-inner animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-3.5 border-b border-purple-200/60">
            <span className="text-xs font-black uppercase tracking-wider text-purple-950">
              Unscheduled Task Queue — Drag cards directly into any day column
            </span>
            <span className="text-xs font-bold text-purple-700">
              {unplanned.length} items ready to schedule
            </span>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-3 max-h-56 overflow-y-auto pr-1">
            {unplanned.length === 0 ? (
              <span className="text-sm font-bold text-purple-400 py-3">
                All backlog tasks are successfully scheduled for this week!
              </span>
            ) : (
              unplanned.map((t) => {
                const theme = PRIORITY_THEMES[t.priority] || PRIORITY_THEMES.P3;
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    className="group flex items-center gap-3 rounded-2xl border border-purple-200/90 bg-white px-4 py-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-all"
                  >
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${theme.bg} ${theme.text}`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-sm font-extrabold text-slate-800 truncate max-w-[220px]">
                      {t.title}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ▦ TAB 1: 7-DAY PRECISION WORKLOAD GRID */}
      {activeTab === "WEEK" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 items-start">
          {weekDays.map((day) => {
            const dayTasks = filteredTasks.filter((t) => {
              if (!t.dueAt) return false;
              return t.dueAt.startsWith(day.dateStr);
            });

            const totalMins = dayTasks.reduce(
              (acc, t) => acc + (t.estimatedMinutes || 60),
              0
            );
            const plannedHours = (totalMins / 60).toFixed(1).replace(".0", "");
            const capacityPercent = Math.min(Math.round((totalMins / 480) * 100), 100);
            const isDropTarget = dropTargetDay === day.dateStr;

            return (
              <div
                key={day.dateStr}
                onDragOver={(e) => handleDragOver(e, day.dateStr)}
                onDrop={(e) => handleDrop(e, day.dateStr)}
                className={`group flex flex-col min-h-[640px] rounded-[34px] p-4 transition-all duration-200 relative ${
                  day.isToday
                    ? "border-2 border-purple-500 bg-gradient-to-b from-purple-50/90 via-white to-white shadow-2xl ring-4 ring-purple-400/25"
                    : "border border-slate-200/90 bg-white/95 shadow-sm hover:border-slate-300 hover:shadow-lg"
                } ${isDropTarget ? "ring-4 ring-indigo-500 bg-indigo-50/80 scale-[1.02]" : ""}`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-black tracking-widest text-slate-400">
                      {day.name}
                    </span>
                    <p className="text-[11px] font-bold text-slate-400">
                      {day.monthName}
                    </p>
                  </div>

                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-base font-black transition-all ${
                      day.isToday
                        ? "bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-500/40 scale-110"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-black text-slate-500 font-mono">
                    <span>{plannedHours}h planned</span>
                    <span
                      className={
                        capacityPercent > 85
                          ? "text-rose-600 font-extrabold"
                          : "text-slate-600"
                      }
                    >
                      {capacityPercent}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${capacityPercent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        capacityPercent > 85
                          ? "bg-rose-500"
                          : day.isToday
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600"
                          : "bg-emerald-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Tasks Stack */}
                <div className="mt-4 flex-1 space-y-3">
                  {dayTasks.length === 0 ? (
                    <div
                      className={`flex h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-3 transition-all ${
                        isDropTarget
                          ? "border-purple-500 bg-purple-100/60 text-purple-900 font-extrabold text-sm"
                          : "border-slate-100 bg-slate-50/40 text-slate-300 text-xs"
                      }`}
                    >
                      {isDropTarget ? (
                        "Release to schedule here"
                      ) : (
                        <>
                          <span className="text-xl opacity-50">☕</span>
                          <span className="mt-1 font-bold">No tasks</span>
                        </>
                      )}
                    </div>
                  ) : (
                    dayTasks.map((t) => {
                      const isDragged = draggedTaskId === t.id;
                      const assignee = t.assignees?.[0]?.user;
                      const theme = PRIORITY_THEMES[t.priority] || PRIORITY_THEMES.P3;

                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t.id)}
                          onDragEnd={() => setDraggedTaskId(null)}
                          className={`group/card relative rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl ${
                            isDragged ? "opacity-25 scale-95 ring-2 ring-purple-500" : ""
                          }`}
                        >
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs ${theme.bg} ${theme.text}`}
                            >
                              {t.priority}
                            </span>
                            {t.project && (
                              <span className="text-[11px] font-bold text-purple-700 truncate max-w-[85px]">
                                📁 {t.project.name}
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="mt-2 text-sm font-black text-slate-900 line-clamp-2 leading-snug tracking-tight">
                            {t.title}
                          </h4>

                          {/* Footer Details */}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-bold text-slate-400">
                            <span className="font-mono">⏱️ {t.estimatedMinutes || 60}m</span>
                            <span className="truncate max-w-[75px] font-extrabold text-slate-800">
                              👤 {assignee?.name?.split(" ")[0] || "Unassigned"}
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
      )}

      {/* ▦ TAB 2: DAY AGENDA DETAIL VIEW */}
      {activeTab === "DAY" && (
        <div className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-xl space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Today's High-Priority Pipeline
            </h3>
            <p className="text-sm font-medium text-slate-500">
              Tasks scheduled for today organized by urgency and estimated execution time.
            </p>
          </div>

          <div className="space-y-3.5">
            {filteredTasks
              .filter((t) => t.dueAt?.startsWith(new Date().toISOString().split("T")[0]))
              .map((t) => {
                const theme = PRIORITY_THEMES[t.priority] || PRIORITY_THEMES.P3;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4.5 hover:border-purple-300 hover:bg-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`rounded-xl px-2.5 py-1 text-xs font-black uppercase ${theme.bg} ${theme.text}`}
                      >
                        {t.priority}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{t.title}</h4>
                        <span className="text-xs font-semibold text-slate-500">
                          {t.project ? `Project: ${t.project.name} • ` : ""}
                          Duration: {t.estimatedMinutes || 60} mins
                        </span>
                      </div>
                    </div>

                    <span className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-black text-slate-800 shadow-xs border border-slate-200">
                      Status: {t.status}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ▦ TAB 3: TEAM WORKLOAD & CAPACITY */}
      {activeTab === "CAPACITY" && (
        <div className="rounded-[34px] border border-slate-200 bg-white p-7 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Team Workload & Capacity Heatmap
            </h3>
            <p className="text-sm font-medium text-slate-500">
              Real-time balance of assigned tasks and cumulative workload across colleagues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teamMembers.map((member) => {
              const assignedTasks = tasks.filter((t) =>
                t.assignees?.some((a) => a.user.id === member.id)
              );
              const totalMins = assignedTasks.reduce(
                (acc, t) => acc + (t.estimatedMinutes || 60),
                0
              );
              const hours = (totalMins / 60).toFixed(1);

              return (
                <div
                  key={member.id}
                  className="rounded-[28px] border border-slate-200/90 bg-slate-50/70 p-5 space-y-4 hover:border-purple-300 hover:bg-white hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-purple-500/25">
                        {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">
                          {member.name || member.email.split("@")[0]}
                        </h4>
                        <span className="text-xs font-bold text-slate-400">
                          {member.role?.name || "Team Member"}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-800 font-mono">
                      {assignedTasks.length} tasks
                    </span>
                  </div>

                  <div className="border-t border-slate-200/70 pt-3 flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>Total Allocated Workload</span>
                    <span className="font-mono text-sm font-black text-purple-700">
                      {hours} hrs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}