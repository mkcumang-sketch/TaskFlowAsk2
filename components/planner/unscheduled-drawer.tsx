"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface UnscheduledDrawerProps {
  tasks: any[];
  onSchedule: (taskId: string, targetDate: string) => Promise<void>;
  onClose: () => void;
}

export function UnscheduledDrawer({ tasks, onSchedule, onClose }: UnscheduledDrawerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleQuickSchedule = async (taskId: string, daysToAdd: number) => {
    setLoadingId(taskId);
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    date.setHours(18, 0, 0, 0); // Default end of work day
    await onSchedule(taskId, date.toISOString());
    setLoadingId(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            📋 Unscheduled Tasks ({tasks.length})
          </h3>
          <p className="text-xs text-slate-500">Assign timeblocks or schedule onto the calendar.</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            All backlog tasks are scheduled!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:border-purple-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{task.title}</h4>
                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                  {task.priority}
                </span>
              </div>

              {task.project && (
                <span className="mt-1.5 inline-block text-[10px] font-semibold text-purple-600">
                  📁 {task.project.name}
                </span>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2.5">
                <span className="text-[11px] font-mono text-slate-400">
                  ⏱ {task.estimatedMinutes || 30}m
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    disabled={loadingId === task.id}
                    onClick={() => handleQuickSchedule(task.id, 0)}
                    className="h-7 rounded-lg bg-slate-900 px-2.5 text-[10px] font-bold text-white hover:bg-slate-800"
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === task.id}
                    onClick={() => handleQuickSchedule(task.id, 1)}
                    className="h-7 rounded-lg border-slate-200 px-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Tomorrow
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}