"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  startAt?: string | Date | null;
  dueAt?: string | Date | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  project?: { id: string; name: string } | null;
  assignees?: Array<{ user: { id: string; name: string | null; email: string } }>;
}

interface TodayCockpitProps {
  initialTasks: TaskItem[];
  unplannedTasks?: TaskItem[];
  habits?: any[];
  completedHabitIds?: string[];
  currentUserId: string;
  metrics: {
    totalEstimate: number;
    totalSpent: number;
    remainingMinutes: number;
  };
}

export function TodayCockpit({
  initialTasks = [],
  unplannedTasks = [],
  currentUserId,
  metrics,
}: TodayCockpitProps) {
  // Live synchronous timer
  const [now, setNow] = useState<number>(Date.now());
  const [filterPriority, setFilterPriority] = useState<string>("ALL");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Priority Styles & Magical Aurora Glows
  const getPriorityStyle = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case "P1":
      case "URGENT":
        return {
          pill: "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-500/25",
          core: "bg-rose-500 shadow-rose-500/50",
          glow: "from-rose-500/10 via-purple-500/5 to-transparent",
          border: "group-hover:border-rose-400",
        };
      case "P2":
      case "HIGH":
        return {
          pill: "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-orange-500/25",
          core: "bg-orange-500 shadow-orange-500/50",
          glow: "from-orange-500/10 via-amber-500/5 to-transparent",
          border: "group-hover:border-orange-400",
        };
      case "P3":
      case "MEDIUM":
        return {
          pill: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/25",
          core: "bg-blue-500 shadow-blue-500/50",
          glow: "from-blue-500/10 via-cyan-500/5 to-transparent",
          border: "group-hover:border-blue-400",
        };
      case "P4":
      case "LOW":
        return {
          pill: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25",
          core: "bg-indigo-500 shadow-indigo-500/50",
          glow: "from-indigo-500/10 via-purple-500/5 to-transparent",
          border: "group-hover:border-indigo-400",
        };
      default:
        return {
          pill: "bg-slate-700 text-white shadow-slate-500/20",
          core: "bg-slate-400 shadow-slate-400/40",
          glow: "from-slate-500/10 to-transparent",
          border: "group-hover:border-slate-300",
        };
    }
  };

  // Live countdown timer fetched dynamically after task is accepted
  const getTaskSlaTimer = (task: TaskItem) => {
    const isAccepted = task.status === "IN_PROGRESS" || Boolean(task.startAt);
    const isCompleted = task.status === "COMPLETED" || task.status === "APPROVED";
    const isReview = task.status === "REVIEW";

    if (isCompleted) {
      return {
        label: "Approved ✨",
        isOverdue: false,
        isUrgent: false,
        statusLabel: "Completed",
        statusClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    if (isReview) {
      return {
        label: "Under Review 🔍",
        isOverdue: false,
        isUrgent: false,
        statusLabel: "In Review",
        statusClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    }

    if (!isAccepted) {
      return {
        label: "⏳ Pending Accept",
        isOverdue: false,
        isUrgent: false,
        statusLabel: "1h SLA Window",
        statusClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }

    if (!task.dueAt) {
      return {
        label: "⚡ In Flight",
        isOverdue: false,
        isUrgent: false,
        statusLabel: "Working",
        statusClass: "bg-purple-50 text-purple-700 border-purple-200",
      };
    }

    const diffMs = new Date(task.dueAt).getTime() - now;
    if (diffMs <= 0) {
      const overdueMins = Math.abs(Math.floor(diffMs / (1000 * 60)));
      const overdueHrs = Math.floor(overdueMins / 60);
      const remMins = overdueMins % 60;
      return {
        label: overdueHrs > 0 ? `🚨 Breached by ${overdueHrs}h ${remMins}m` : `🚨 Breached by ${remMins}m`,
        isOverdue: true,
        isUrgent: true,
        statusLabel: "SLA Overdue",
        statusClass: "bg-rose-50 text-rose-700 border-rose-300 animate-pulse",
      };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
    const isUrgent = diffMs < 30 * 60 * 1000;

    const formattedTime = hours > 0 
      ? `${hours}h ${mins}m left` 
      : `${mins}m ${secs}s left`;

    return {
      label: formattedTime,
      isOverdue: false,
      isUrgent,
      statusLabel: "SLA Active",
      statusClass: isUrgent
        ? "bg-amber-50 text-amber-800 border-amber-300"
        : "bg-purple-50 text-purple-700 border-purple-200",
    };
  };

  const cleanDescription = (desc?: string | null) => {
    if (!desc) return "Active scheduled milestone";
    return desc.split("---")[0].trim() || "Active scheduled milestone";
  };

  const filteredTasks = initialTasks.filter((t) => {
    if (filterPriority === "ALL") return true;
    const p = t.priority?.toUpperCase();
    if (filterPriority === "P1" && (p === "P1" || p === "URGENT")) return true;
    if (filterPriority === "P2" && (p === "P2" || p === "HIGH")) return true;
    if (filterPriority === "P3" && (p === "P3" || p === "MEDIUM")) return true;
    return p === filterPriority;
  });

  return (
    <div className="w-full space-y-6 font-sans select-none">
      {/* 🔮 1. TOP METRIC OVERVIEW BANNER */}
      <div className="relative overflow-hidden rounded-[30px] border border-white/80 bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 p-5 md:p-7 shadow-2xl text-white">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-12 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 font-mono">
                Today Scheduled Matrix
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
              Deliverables Cockpit & Live SLA Radar
            </h1>
            <p className="text-xs text-slate-300">
              Real-time synchronization across accepted milestones and priority time limits.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/tasks">
              <Button className="h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white px-4 shadow-lg shadow-purple-500/25 transition cursor-pointer">
                + New Task
              </Button>
            </Link>
          </div>
        </div>

        {/* Priority Filter Bar */}
        <div className="mt-5 flex gap-2 border-t border-white/10 pt-3 overflow-x-auto pb-1">
          {["ALL", "P1", "P2", "P3", "P4", "P5"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPriority(p)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition cursor-pointer ${
                filterPriority === p
                  ? "bg-white text-slate-950 shadow-md"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {p === "ALL" ? "All Priorities" : `${p} Stream`}
            </button>
          ))}
        </div>
      </div>

      {/* 📅 2. SCHEDULED DELIVERABLES LIST (PLAY BUTTON & 0m/24h TIMER REPLACED) */}
      <div className="rounded-[30px] border border-slate-200/90 bg-white/95 p-5 md:p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              SCHEDULED DELIVERABLES
            </span>
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black font-mono text-purple-700">
              {filteredTasks.length}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-12 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>LIVE SLA COUNTDOWN</span>
            <span className="w-12 text-center">PRIORITY</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400">
              No scheduled deliverables for today matching this stream.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const theme = getPriorityStyle(task.priority);
              const timer = getTaskSlaTimer(task);
              const isAccepted = task.status === "IN_PROGRESS" || Boolean(task.startAt);

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className={`group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${theme.border}`}
                >
                  {/* Glowing Ambient Gradient on Hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${theme.glow} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                  />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* LEFT: Replaced Play Button with Holographic Kinetic Pulse Beacon */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-inner group-hover:border-purple-400 transition">
                        <div
                          className={`h-3 w-3 rounded-full ${theme.core} shadow-md transition-transform group-hover:scale-125 ${
                            isAccepted && task.status !== "COMPLETED" ? "animate-pulse" : ""
                          }`}
                        />
                        {isAccepted && task.status !== "COMPLETED" && (
                          <span className="absolute inset-0 rounded-xl border border-purple-400/50 animate-ping" />
                        )}
                      </div>

                      {/* Task Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition truncate">
                            {task.title}
                          </h4>
                          {task.project && (
                            <span className="hidden md:inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 truncate max-w-[120px]">
                              📁 {task.project.name}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-400 line-clamp-1 truncate">
                          {cleanDescription(task.description)}
                        </p>
                      </div>
                    </div>

                    {/* RIGHT: Replaced "0m / 24h" with Live SLA Countdown Clock & Priority Pill */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Live Ticking Countdown Pill */}
                      <div
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black border transition ${timer.statusClass}`}
                      >
                        <span className="text-xs">⏱️</span>
                        <span className="font-mono tracking-tight">{timer.label}</span>
                      </div>

                      {/* Priority Capsule */}
                      <div
                        className={`flex h-8 items-center justify-center rounded-xl px-3 text-[10px] font-black uppercase tracking-wider shadow-xs transition-transform group-hover:scale-105 ${theme.pill}`}
                      >
                        {task.priority}
                      </div>

                      {/* Hover Arrow Indicator */}
                      <span className="hidden sm:inline-block text-slate-300 group-hover:text-purple-600 group-hover:translate-x-1 transition text-sm font-bold">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}