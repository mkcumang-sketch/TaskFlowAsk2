"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  assignees?: { user: { name: string | null; email: string } }[];
  completionProofType?: string | null;
}

const COLUMNS = [
  { id: "ASSIGNED", label: "To Do / Assigned", color: "border-blue-400 bg-blue-50/40" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-amber-400 bg-amber-50/40" },
  { id: "REVIEW", label: "Under Review", color: "border-purple-400 bg-purple-50/40" },
  { id: "COMPLETED", label: "Completed / Approved", color: "border-emerald-400 bg-emerald-50/40" },
];

export function KanbanBoard({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === targetStatus) return;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    setMovingTaskId(taskId);

    try {
      const res = await fetch(`/api/tasks/${taskId}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus: targetStatus }),
      });

      if (!res.ok) {
        // Rollback on server rejection
        const err = await res.json();
        alert(err.error || "Transition not permitted.");
        setTasks(initialTasks);
      }
    } catch {
      alert("Failed to update status.");
      setTasks(initialTasks);
    } finally {
      setMovingTaskId(null);
    }
  };

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <input
          type="text"
          placeholder="Filter cards in board..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-800"
        />
        <span className="text-xs text-slate-500">Drag tasks across columns to transition status</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter(
            (t) =>
              t.status === col.id ||
              (col.id === "COMPLETED" && t.status === "APPROVED")
          );

          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col min-h-[560px] rounded-2xl border-t-4 border p-3.5 ${col.color}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {col.label}
                </span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">
                  {colTasks.length}
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
                      movingTaskId === task.id ? "opacity-40" : "opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                        {task.priority}
                      </span>
                      {task.completionProofType && task.completionProofType !== "NONE" && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                          {task.completionProofType} PROOF
                        </span>
                      )}
                    </div>

                    <Link href={`/tasks/${task.id}`} className="mt-2 block">
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-2 hover:text-blue-600">
                        {task.title}
                      </h4>
                    </Link>

                    {task.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                      <span>{task.dueAt ? formatDateTime(task.dueAt) : "No deadline"}</span>
                      <span className="truncate max-w-[90px] font-medium text-slate-600">
                        {task.assignees?.[0]?.user?.name || "Unassigned"}
                      </span>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
                    Drop task here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}