"use client";

import { useState, useEffect } from "react";

interface QuantumSlaReactorProps {
  priority: string;
  status: string;
  startAt?: string | Date | null;
  dueAt?: string | Date | null;
}

export function QuantumSlaReactor({
  priority,
  status,
  startAt,
  dueAt,
}: QuantumSlaReactorProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isAccepted = status === "IN_PROGRESS" || Boolean(startAt);
  const isCompleted = status === "COMPLETED" || status === "APPROVED";
  const isReview = status === "REVIEW";

  // Target SLA difference
  const targetMs = dueAt ? new Date(dueAt).getTime() : 0;
  const diffMs = targetMs ? targetMs - now : 0;
  const isOverdue = isAccepted && diffMs <= 0 && !isCompleted;

  const hours = Math.max(0, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60)));
  const mins = Math.max(0, Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60)));
  const secs = Math.max(0, Math.floor((Math.abs(diffMs) % (1000 * 60)) / 1000));

  // Dynamic Aura Spectrum
  const getSpectrum = () => {
    if (isCompleted) {
      return {
        cardBg: "from-emerald-950 via-slate-900 to-teal-950",
        border: "border-emerald-500/50 shadow-emerald-500/20",
        primaryGlow: "bg-emerald-500/30",
        secondaryGlow: "bg-teal-500/20",
        accentText: "text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        icon: "✨",
        title: "Mission Completed",
        statusText: "All deliverables verified and approved.",
      };
    }
    if (isOverdue) {
      return {
        cardBg: "from-rose-950 via-slate-950 to-red-950",
        border: "border-rose-500/60 shadow-rose-500/30 ring-1 ring-rose-500/40",
        primaryGlow: "bg-rose-500/30",
        secondaryGlow: "bg-red-500/20",
        accentText: "text-rose-400",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
        icon: "🚨",
        title: "SLA Threshold Breached",
        statusText: "Escalated to management. Expedited action required.",
      };
    }
    if (priority === "P1") {
      return {
        cardBg: "from-rose-950 via-purple-950 to-slate-950",
        border: "border-rose-500/40 shadow-rose-500/20",
        primaryGlow: "bg-rose-500/25",
        secondaryGlow: "bg-purple-500/20",
        accentText: "text-rose-400",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse",
        icon: "⚡",
        title: "P1 Hyper-Velocity Engine",
        statusText: "High urgency mandate under active 2-hour window.",
      };
    }
    return {
      cardBg: "from-indigo-950 via-purple-950 to-slate-950",
      border: "border-purple-500/40 shadow-purple-500/20",
      primaryGlow: "bg-purple-600/30",
      secondaryGlow: "bg-indigo-600/20",
      accentText: "text-purple-300",
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      icon: "🌌",
      title: `${priority} Quantum Stream`,
      statusText: "Milestone synchronized with operations dashboard.",
    };
  };

  const spectrum = getSpectrum();

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border ${spectrum.border} bg-gradient-to-br ${spectrum.cardBg} p-5 text-white shadow-2xl backdrop-blur-2xl transition-all duration-300 select-none`}
    >
      {/* 🔮 Background Aurora Energy Orbs */}
      <div
        className={`absolute -right-10 -top-10 h-36 w-36 rounded-full ${spectrum.primaryGlow} blur-3xl pointer-events-none animate-pulse`}
      />
      <div
        className={`absolute -left-10 -bottom-10 h-36 w-36 rounded-full ${spectrum.secondaryGlow} blur-3xl pointer-events-none`}
      />

      {/* Header Beacon Bar */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                isOverdue ? "bg-rose-400" : isCompleted ? "bg-emerald-400" : "bg-purple-400"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isOverdue ? "bg-rose-500" : isCompleted ? "bg-emerald-500" : "bg-purple-500"
              }`}
            />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 font-mono">
            {spectrum.title}
          </span>
        </div>

        <span
          className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase border ${spectrum.badge} font-mono tracking-wider`}
        >
          {status}
        </span>
      </div>

      {/* Kinetic Hologram Display */}
      <div className="relative z-10 py-6 text-center space-y-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
          {isCompleted
            ? "Final Workflow Status"
            : isAccepted
            ? "Remaining SLA Time"
            : "Awaiting Initiation"}
        </span>

        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            <span>✨</span> APPROVED
          </div>
        ) : isReview ? (
          <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-black text-amber-300 tracking-tight">
            <span>🔍</span> IN REVIEW & PROOF
          </div>
        ) : !isAccepted ? (
          <div className="flex items-center justify-center gap-2 text-lg sm:text-xl font-black text-amber-300 tracking-tight animate-pulse py-1">
            <span>⏳</span> AWAITING ACCEPTANCE
          </div>
        ) : (
          /* Live Kinetic Triple Digit Clock */
          <div className="flex items-center justify-center gap-2 font-mono text-3xl sm:text-4xl font-black tracking-tight drop-shadow-lg">
            <div className="flex flex-col items-center bg-white/10 rounded-2xl px-3 py-1.5 border border-white/10 backdrop-blur-md">
              <span>{String(hours).padStart(2, "0")}</span>
              <span className="text-[8px] text-slate-400 font-sans uppercase tracking-wider">Hours</span>
            </div>
            <span className={`${spectrum.accentText} animate-pulse text-2xl`}>:</span>
            <div className="flex flex-col items-center bg-white/10 rounded-2xl px-3 py-1.5 border border-white/10 backdrop-blur-md">
              <span>{String(mins).padStart(2, "0")}</span>
              <span className="text-[8px] text-slate-400 font-sans uppercase tracking-wider">Minutes</span>
            </div>
            <span className={`${spectrum.accentText} animate-pulse text-2xl`}>:</span>
            <div className="flex flex-col items-center bg-white/10 rounded-2xl px-3 py-1.5 border border-white/10 backdrop-blur-md">
              <span>{String(secs).padStart(2, "0")}</span>
              <span className="text-[8px] text-slate-400 font-sans uppercase tracking-wider">Seconds</span>
            </div>
          </div>
        )}

        <p className="text-[11px] font-medium text-slate-300/80 px-2 pt-1 leading-snug">
          {spectrum.statusText}
        </p>
      </div>

      {/* Footer Metrics */}
      <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <span>⚡ Priority Window:</span>
          <strong className="text-white font-mono uppercase">{priority}</strong>
        </span>
        <span className="text-[9px] font-mono text-purple-300 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          Quantum Engine Active
        </span>
      </div>
    </div>
  );
}