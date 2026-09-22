"use client";

import Link from "next/link";
import { useMemo } from "react";

interface DeliverableItem {
  id: string;
  title: string;
  description?: string | null;
  priority: "P1" | "P2" | "P3" | "P4" | "P5" | string;
  status: "ASSIGNED" | "IN_PROGRESS" | "REVIEW" | "COMPLETED" | string;
  startAt?: string | Date | null;
  dueAt?: string | Date | null;
  project?: { name: string } | null;
  assignees?: Array<{ user: { name: string | null; email: string } }>;
}

interface ScheduledDeliverablesProps {
  tasks: DeliverableItem[];
}

export function ScheduledDeliverablesList({ tasks = [] }: ScheduledDeliverablesProps) {
  // Priority Theme Engine
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "P1":
        return {
          glow: "from-rose-500/20 to-red-600/10 border-rose-300 text-rose-700 bg-rose-50",
          pill: "bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-500/30",
          core: "bg-rose-500 shadow-rose-500/50",
          tag: "P1 • Urgent",
        };
      case "P2":
        return {
          glow: "from-orange-500/20 to-amber-600/10 border-orange-300 text-orange-700 bg-orange-50",
          pill: "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-orange-500/30",
          core: "bg-orange-500 shadow-orange-500/50",
          tag: "P2 • 4h SLA",
        };
      case "P3":
        return {
          glow: "from-blue-500/20 to-cyan-600/10 border-blue-300 text-blue-700 bg-blue-50",
          pill: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/30",
          core: "bg-blue-500 shadow-blue-500/50",
          tag: "P3 • 8h SLA",
        };
      case "P4":
        return {
          glow: "from-indigo-500/20 to-purple-600/10 border-indigo-300 text-indigo-700 bg-indigo-50",
          pill: "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/30",
          core: "bg-indigo-500 shadow-indigo-500/50",
          tag: "P4 • 24h",
        };
      default:
        return {
          glow: "from-slate-500/20 to-slate-600/10 border-slate-300 text-slate-700 bg-slate-50",
          pill: "bg-slate-700 text-white shadow-slate-500/30",
          core: "bg-slate-400 shadow-slate-400/50",
          tag: "P5 • 48h",
        };
    }
  };

  const cleanDescription = (desc?: string | null) => {
    if (!desc) return "Active scheduled milestone";
    // Purani repetitive lines saaf karke clean summary dikhaye
    return desc.split("---")[0].trim() || "Active scheduled milestone";
  };

  return (
    <div className="w-full space-y-3 font-sans select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Scheduled Deliverables
          </span>
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black font-mono text-purple-700">
            {tasks.length}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>Workflow Pulse</span>
          <span>Priority Window</span>
        </div>
      </div>

      {/* Deliverable Items List */}
      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            No scheduled deliverables in this queue.
          </div>
        ) : (
          tasks.map((task) => {
            const style = getPriorityStyle(task.priority);
            const isAccepted = task.status === "IN_PROGRESS" || Boolean(task.startAt);
            const isCompleted = task.status === "COMPLETED" || task.status === "APPROVED";
            const isReview = task.status === "REVIEW";

            return (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="group relative block overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10"
              >
                {/* 🌌 Ambient Glass Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-50/0 via-purple-50/40 to-indigo-50/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* LEFT: Replaced Play Button with Glowing Holographic Pulse Core */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 border border-slate-200/80 group-hover:border-purple-400 transition shadow-inner">
                      {/* Kinetic Reactor Ring */}
                      <div
                        className={`h-3 w-3 rounded-full ${style.core} shadow-lg transition-transform group-hover:scale-125 ${
                          isAccepted && !isCompleted ? "animate-pulse" : ""
                        }`}
                      />
                      {isAccepted && !isCompleted && (
                        <span className="absolute inset-0 rounded-xl border border-purple-400/50 animate-ping" />
                      )}
                    </div>

                    {/* Title & Sanitized Clean Description */}
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

                  {/* RIGHT: Replaced "0m / 2h" with Magical SLA Capsule & Priority Pill */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Live Status Orb */}
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-800 flex items-center gap-1 shadow-2xs">
                          <span>✨</span> Approved
                        </span>
                      ) : isReview ? (
                        <span className="rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-800 flex items-center gap-1 shadow-2xs">
                          <span>🔍</span> Under Review
                        </span>
                      ) : isAccepted ? (
                        <span className="rounded-xl border border-sky-300 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-800 flex items-center gap-1.5 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-ping" />
                          In Flight
                        </span>
                      ) : (
                        <span className="rounded-xl border border-slate-200 bg-slate-100/80 px-2.5 py-1 text-[10px] font-black text-slate-600">
                          ⏳ Queued
                        </span>
                      )}
                    </div>

                    {/* Gradient Priority Pill */}
                    <div
                      className={`flex h-8 items-center justify-center rounded-xl px-3 text-[10px] font-black uppercase tracking-wider shadow-sm transition-transform group-hover:scale-105 ${style.pill}`}
                    >
                      {task.priority}
                    </div>

                    {/* Hover Arrow Icon */}
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
  );
}