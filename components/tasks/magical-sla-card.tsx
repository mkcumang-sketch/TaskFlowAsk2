"use client";

import { useState, useEffect } from "react";

interface MagicalSlaCardProps {
  priority: string;
  status: string;
  startAt?: string | Date | null;
  dueAt?: string | Date | null;
}

export function MagicalSlaCard({ priority, status, startAt, dueAt }: MagicalSlaCardProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAccepted = status === "IN_PROGRESS" || Boolean(startAt);
  const isCompleted = status === "COMPLETED" || status === "APPROVED";
  const isReview = status === "REVIEW";

  // Calculate remaining
  const targetTime = dueAt ? new Date(dueAt).getTime() : 0;
  const diffMs = targetTime ? targetTime - now : 0;
  const isOverdue = isAccepted && diffMs <= 0 && !isCompleted;

  const hours = Math.max(0, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60)));
  const mins = Math.max(0, Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60)));
  const secs = Math.max(0, Math.floor((Math.abs(diffMs) % (1000 * 60)) / 1000));

  // Visual Theme by Priority
  const getTheme = () => {
    if (isCompleted) {
      return {
        bg: "from-emerald-950 via-slate-900 to-teal-950",
        border: "border-emerald-500/40",
        glow: "bg-emerald-500/20",
        accent: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        label: "Mission Accomplished",
      };
    }
    if (isOverdue) {
      return {
        bg: "from-rose-950 via-slate-950 to-red-950",
        border: "border-rose-500/60 ring-2 ring-rose-500/30",
        glow: "bg-rose-500/30",
        accent: "text-rose-400",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
        label: "SLA Breached",
      };
    }
    if (priority === "P1") {
      return {
        bg: "from-red-950 via-purple-950 to-slate-950",
        border: "border-red-500/40",
        glow: "bg-red-500/20",
        accent: "text-rose-400",
        badge: "bg-red-500/20 text-red-300 border-red-500/30",
        label: "P1 Hyper Speed SLA",
      };
    }
    return {
      bg: "from-indigo-950 via-purple-950 to-slate-950",
      border: "border-purple-500/40",
      glow: "bg-purple-500/20",
      accent: "text-purple-300",
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      label: `${priority} Warp Stream`,
    };
  };

  const theme = getTheme();

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-5 text-white shadow-2xl backdrop-blur-xl transition-all duration-300`}>
      {/* 🔮 Background Aurora Glow Blobs */}
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${theme.glow} blur-2xl pointer-events-none animate-pulse`} />
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

      {/* Floating Sparkles Grid Header */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOverdue ? "bg-rose-400" : "bg-purple-400"} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOverdue ? "bg-rose-500" : "bg-purple-500"}`} />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 font-mono">
            {theme.label}
          </span>
        </div>

        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase border ${theme.badge} font-mono tracking-wider`}>
          {status}
        </span>
      </div>

      {/* 🚀 Center Kinetic Timer Hologram */}
      <div className="relative z-10 py-5 text-center space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
          {isCompleted ? "Status Summary" : isAccepted ? "Time Remaining" : "SLA Initiation"}
        </span>

        {isCompleted ? (
          <div className="text-3xl font-black text-emerald-400 tracking-tight flex items-center justify-center gap-2">
            <span>✨</span> APPROVED
          </div>
        ) : isReview ? (
          <div className="text-2xl font-black text-amber-300 tracking-tight flex items-center justify-center gap-2">
            <span>🔍</span> IN REVIEW
          </div>
        ) : !isAccepted ? (
          <div className="text-xl font-black text-amber-300 tracking-tight animate-pulse flex items-center justify-center gap-1.5 py-1">
            <span>⏳</span> WAITING ACCEPT
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 font-mono text-3xl font-black tracking-tight drop-shadow-md">
            <div className="bg-white/10 rounded-xl px-2.5 py-1 border border-white/10">
              {String(hours).padStart(2, "0")}
              <span className="block text-[8px] text-slate-400 font-sans uppercase">Hrs</span>
            </div>
            <span className={`${theme.accent} animate-pulse`}>:</span>
            <div className="bg-white/10 rounded-xl px-2.5 py-1 border border-white/10">
              {String(mins).padStart(2, "0")}
              <span className="block text-[8px] text-slate-400 font-sans uppercase">Min</span>
            </div>
            <span className={`${theme.accent} animate-pulse`}>:</span>
            <div className="bg-white/10 rounded-xl px-2.5 py-1 border border-white/10">
              {String(secs).padStart(2, "0")}
              <span className="block text-[8px] text-slate-400 font-sans uppercase">Sec</span>
            </div>
          </div>
        )}

        <p className="text-[10px] font-medium text-slate-400 pt-1">
          {isOverdue
            ? "⚠️ Escalation triggered to department manager"
            : isAccepted
            ? "Target milestone synced with organization matrix"
            : "Requires acceptance within 1 hour SLA window"}
        </p>
      </div>

      {/* ⚡ Micro Pulse Indicator */}
      <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1">
          <span>⚡ Priority:</span> <strong className="text-white font-mono">{priority}</strong>
        </span>
        <span className="text-[9px] font-mono text-purple-300">
          ● Quantum Sync Active
        </span>
      </div>
    </div>
  );
}