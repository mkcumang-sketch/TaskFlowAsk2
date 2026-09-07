"use client";

interface MetricsProps {
  totalEstimate: number;
  totalSpent: number;
  remainingMinutes: number;
  taskCount: number;
}

export function TodayHeaderMetrics({
  totalEstimate,
  totalSpent,
  remainingMinutes,
  taskCount,
}: MetricsProps) {
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {/* Workload Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sp-card">
        <div className="text-2xs font-bold uppercase tracking-widest text-slate-400">
          Estimated Workload
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-metric-lg font-black tracking-tight text-slate-900 font-mono">
            {formatTime(totalEstimate)}
          </span>
          <span className="text-2xs font-medium text-slate-400 font-mono">
            ({taskCount} tasks)
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-slate-800 transition-all duration-300"
            style={{
              width: `${totalEstimate > 0 ? Math.min(100, (totalSpent / totalEstimate) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Time Tracked Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sp-card">
        <div className="text-2xs font-bold uppercase tracking-widest text-slate-400">
          Time Spent Today
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-metric-lg font-black tracking-tight text-emerald-600 font-mono">
            {formatTime(totalSpent)}
          </span>
          <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
            Live
          </span>
        </div>
        <p className="mt-2 text-2xs text-slate-400 truncate">
          Logged across active work sessions
        </p>
      </div>

      {/* Remaining Workload Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sp-card">
        <div className="text-2xs font-bold uppercase tracking-widest text-slate-400">
          Time Remaining
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-metric-lg font-black tracking-tight text-blue-600 font-mono">
            {formatTime(remainingMinutes)}
          </span>
          <span className="text-2xs font-medium text-slate-400 font-mono">
            to balance
          </span>
        </div>
        <p className="mt-2 text-2xs text-slate-400 truncate">
          Based on current estimates
        </p>
      </div>
    </div>
  );
}