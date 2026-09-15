"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | Date | null;
  startAt?: string | Date | null;
  assignees?: Array<{ user: { id: string; name: string | null; email: string } }>;
  project?: { id: string; name: string } | null;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;
}

interface KanbanBoardProps {
  initialTasks: TaskItem[];
  projects?: Array<{ id: string; name: string }>;
  teamMembers?: Array<{ id: string; name: string | null; email: string }>;
  currentUserId?: string;
}

const COLUMNS = [
  {
    id: "ASSIGNED",
    title: "TO DO / ASSIGNED",
    accentColor: "border-sky-300 bg-sky-50/20 text-sky-950",
    badge: "bg-sky-100 text-sky-800",
    dot: "bg-sky-500",
    dropZoneHover: "border-sky-400 bg-sky-100/60 ring-2 ring-sky-300",
  },
  {
    id: "IN_PROGRESS",
    title: "IN PROGRESS",
    accentColor: "border-amber-300 bg-amber-50/20 text-amber-950",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    dropZoneHover: "border-amber-400 bg-amber-100/60 ring-2 ring-amber-300",
  },
  {
    id: "REVIEW",
    title: "UNDER REVIEW",
    accentColor: "border-purple-300 bg-purple-50/20 text-purple-950",
    badge: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500",
    dropZoneHover: "border-purple-400 bg-purple-100/60 ring-2 ring-purple-300",
  },
  {
    id: "COMPLETED",
    title: "COMPLETED / APPROVED",
    accentColor: "border-emerald-300 bg-emerald-50/20 text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500",
    dropZoneHover: "border-emerald-400 bg-emerald-100/60 ring-2 ring-emerald-300",
  },
];

const PRIORITIES = [
  { id: "P1", label: "P1 • Urgent (1h)", badge: "bg-rose-500 text-white animate-pulse" },
  { id: "P2", label: "P2 • 4h SLA", badge: "bg-orange-500 text-white" },
  { id: "P3", label: "P3 • 8h SLA", badge: "bg-amber-500 text-white" },
  { id: "P4", label: "P4 • 24h SLA", badge: "bg-blue-600 text-white" },
  { id: "P5", label: "P5 • 48h SLA", badge: "bg-slate-600 text-white" },
];

function formatSafeDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "No SLA";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "No SLA";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const fHours = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${fHours}:${m} ${ampm}`;
}

export function KanbanBoard({
  initialTasks = [],
  projects = [],
  teamMembers = [],
  currentUserId,
}: KanbanBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const normalizeStatus = (st: string) => {
    const s = st?.toUpperCase();
    if (s === "DRAFT" || s === "BACKLOG" || s === "TODO") return "ASSIGNED";
    if (s === "APPROVED") return "COMPLETED";
    return s || "ASSIGNED";
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.project?.name?.toLowerCase().includes(q)
    );
  });

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (activeDropColumn !== columnId) {
      setActiveDropColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropColumn(null);

    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!taskId) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove || normalizeStatus(taskToMove.status) === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    setDraggedTaskId(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          completedAt: targetStatus === "COMPLETED" ? new Date().toISOString() : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error("Drop status update failed:", error);
      setTasks(previousTasks);
    }
  };

  return (
    <div className="w-full space-y-4 select-none font-sans overflow-hidden">
      {/* 🧭 Action Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          <Link
            href="/tasks"
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-950 transition"
          >
            List View
          </Link>
          <button
            type="button"
            className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-md cursor-default"
          >
            Kanban View
          </button>
        </div>

        <div className="flex items-center">
          <input
            type="text"
            placeholder="Filter cards in board..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 sm:w-80 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-purple-600 shadow-xs transition"
          />
        </div>
      </div>

      {/* ▦ Kanban Grid Columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-stretch w-full">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter(
            (t) => normalizeStatus(t.status) === column.id
          );
          const isTarget = activeDropColumn === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              style={{ height: "calc(100vh - 250px)", maxHeight: "640px", minHeight: "480px" }}
              className={`flex flex-col rounded-[26px] border-2 bg-white/95 p-3.5 shadow-xl transition-all duration-200 overflow-hidden ${
                column.accentColor
              } ${isTarget ? column.dropZoneHover : ""}`}
            >
              {/* Box Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                  <span className="text-xs font-black tracking-tight text-slate-900">
                    {column.title}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-black font-mono shadow-xs ${column.badge}`}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Scrollable Card Stack Area */}
              <div
                onDragOver={(e) => handleDragOver(e, column.id)}
                className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pr-1 custom-kanban-scroll"
              >
                {colTasks.length === 0 ? (
                  <div
                    onDragOver={(e) => handleDragOver(e, column.id)}
                    className={`flex h-36 items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
                      isTarget
                        ? "border-purple-500 bg-purple-100/60 text-purple-800 font-extrabold text-xs"
                        : "border-slate-200/90 bg-slate-50/50 text-slate-400 text-xs"
                    }`}
                  >
                    {isTarget ? "Release to drop here" : "Drop task here"}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isBeingDragged = draggedTaskId === task.id;
                    const assignedUser = task.assignees?.[0]?.user;
                    const pConfig = PRIORITIES.find((p) => p.id === task.priority) || {
                      badge: "bg-slate-600 text-white",
                      label: task.priority || "P3",
                    };

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        className={`group relative cursor-grab active:cursor-grabbing rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all duration-150 hover:border-purple-300 hover:shadow-md ${
                          isBeingDragged ? "opacity-25 scale-95 ring-2 ring-purple-500" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase shadow-xs ${pConfig.badge}`}
                          >
                            {task.priority || "P3"}
                          </span>

                          {task.project && (
                            <span className="text-[10px] font-bold text-purple-700 truncate max-w-[120px]">
                              📁 {task.project.name}
                            </span>
                          )}
                        </div>

                        <h4 className="mt-2 text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-medium">
                          <span suppressHydrationWarning>
                            {mounted ? formatSafeDate(task.dueAt) : "..."}
                          </span>

                          <span className="font-bold text-slate-800 truncate max-w-[110px]">
                            👤 {assignedUser?.name || assignedUser?.email?.split("@")[0] || "Unassigned"}
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