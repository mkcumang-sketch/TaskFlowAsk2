"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  departmentId?: string | null;
}

interface ProjectItem {
  id: string;
  name: string;
}

interface DepartmentItem {
  id: string;
  name: string;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | Date | null;
  startAt?: string | Date | null;
  projectId?: string | null;
  project?: ProjectItem | null;
  departmentId?: string | null;
  department?: DepartmentItem | null;
  assignees: Array<{ user: UserItem }>;
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
}

interface TaskListClientProps {
  initialTasks: any[];
  projects: ProjectItem[];
  departments?: DepartmentItem[];
  teamMembers: UserItem[];
  currentUserId: string;
}

const PRIORITIES = [
  { id: "P1", label: "P1 • Urgent", desc: "2h Max", badge: "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/30" },
  { id: "P2", label: "P2 • 4 Hours", desc: "4h SLA", badge: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/30" },
  { id: "P3", label: "P3 • 8 Hours", desc: "8h SLA", badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-indigo-500/30" },
  { id: "P4", label: "P4 • 24 Hours", desc: "24h SLA", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-cyan-500/30" },
  { id: "P5", label: "P5 • 48 Hours", desc: "48h SLA", badge: "bg-slate-500/20 text-slate-300 border-slate-500/50 shadow-slate-500/30" },
];

const KANBAN_COLUMNS = [
  { id: "ASSIGNED", title: "Backlog / Assigned", glow: "border-purple-500/30", dot: "bg-purple-400" },
  { id: "IN_PROGRESS", title: "In Progress", glow: "border-indigo-500/30", dot: "bg-indigo-400" },
  { id: "REVIEW", title: "Review & Proof", glow: "border-amber-500/30", dot: "bg-amber-400" },
  { id: "COMPLETED", title: "Done / Approved", glow: "border-emerald-500/30", dot: "bg-emerald-400" },
];

function getRemainingTime(dueAt: string | Date | null | undefined): { label: string; isOverdue: boolean } {
  if (!dueAt) return { label: "No SLA Limit", isOverdue: false };
  const diffMs = new Date(dueAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: "SLA Breached", isOverdue: true };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return { label: `${hours}h ${mins}m left`, isOverdue: false };
  return { label: `${mins}m left`, isOverdue: false };
}

export function TaskListClient({
  initialTasks = [],
  projects = [],
  departments = [],
  teamMembers = [],
  currentUserId,
}: TaskListClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"KANBAN" | "LIST">("KANBAN");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitTaskTarget, setSubmitTaskTarget] = useState<TaskItem | null>(null);

  // Form State: Add Task
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newPriority, setNewPriority] = useState("P3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deliverable Submission Form State
  const [responseNote, setResponseNote] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDelivering, setIsDelivering] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (projectFilter !== "ALL" && task.projectId !== projectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.title?.toLowerCase().includes(q) ||
          task.project?.name?.toLowerCase().includes(q) ||
          task.department?.name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialTasks, priorityFilter, projectFilter, searchQuery]);

  // Toggle Member Checkbox
  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Select all users in a department when department is chosen
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartmentId(deptId);
    if (!deptId) return;

    const deptMemberIds = teamMembers
      .filter((m) => m.departmentId === deptId)
      .map((m) => m.id);

    setSelectedAssigneeIds((prev) => Array.from(new Set([...prev, ...deptMemberIds])));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          assigneeIds: selectedAssigneeIds,
          departmentId: selectedDepartmentId || undefined,
          projectId: selectedProjectId || undefined,
          priority: newPriority,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setSelectedAssigneeIds([]);
        setSelectedDepartmentId("");
        setSelectedProjectId("");
        setNewPriority("P3");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch {
      alert("Network error creating task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartWork = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_WORK" }),
      });
      if (res.ok) router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTaskTarget || isDelivering) return;
    setIsDelivering(true);

    try {
      const res = await fetch(`/api/tasks/${submitTaskTarget.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_WORK",
          feedback: responseNote,
        }),
      });

      if (res.ok) {
        setSubmitTaskTarget(null);
        setResponseNote("");
        setFileUrl("");
        setFileName("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Submission failed");
      }
    } catch {
      alert("Network communication error");
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <div className="relative min-h-[88vh] w-full space-y-6 font-sans select-none">
      {/* 🔮 Background Ambient Aurora Mesh */}
      <div className="pointer-events-none fixed -top-24 -left-20 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-600/20 via-indigo-600/15 to-transparent blur-[160px]" />
      <div className="pointer-events-none fixed top-1/3 -right-20 h-[550px] w-[550px] rounded-full bg-gradient-to-bl from-indigo-500/20 via-fuchsia-600/15 to-transparent blur-[180px]" />

      {/* 🧭 Top Responsive Control Deck */}
      <div className="relative z-10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-slate-900/60 p-4 md:p-5 shadow-2xl backdrop-blur-2xl">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] w-fit">
          <button
            type="button"
            onClick={() => setViewMode("KANBAN")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-black tracking-wider transition ${
              viewMode === "KANBAN"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ▦ Kanban Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-black tracking-wider transition ${
              viewMode === "LIST"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            ☰ List View
          </button>
        </div>

        {/* Right: Search, Priority & Action */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-11 cursor-pointer rounded-2xl border border-white/10 bg-slate-950/80 px-3.5 text-xs font-bold text-slate-200 outline-none backdrop-blur-md focus:border-purple-500/50"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-11 cursor-pointer rounded-2xl border border-white/10 bg-slate-950/80 px-3.5 text-xs font-bold text-slate-200 outline-none backdrop-blur-md focus:border-purple-500/50"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 • Urgent</option>
            <option value="P2">P2 • 4h</option>
            <option value="P3">P3 • 8h</option>
            <option value="P4">P4 • 24h</option>
            <option value="P5">P5 • 48h</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-xs font-bold text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-purple-500/60 transition"
            />
            <span className="absolute right-3.5 top-3 text-xs text-slate-500">🔍</span>
          </div>

          {/* Launch Modal Button */}
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-11 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-5 text-xs font-black text-white shadow-xl shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] border border-white/20 cursor-pointer"
          >
            ✨ Create Task
          </Button>
        </div>
      </div>

      {/* ▦ KANBAN BOARD VIEW (Horizontal Scroll Snap on Mobile) */}
      {viewMode === "KANBAN" ? (
        <div className="relative z-10 flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory xl:grid xl:grid-cols-4 xl:overflow-visible">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => {
              if (col.id === "ASSIGNED") return t.status === "ASSIGNED" || t.status === "DRAFT";
              return t.status === col.id;
            });

            return (
              <div
                key={col.id}
                className="w-[85vw] sm:w-[360px] xl:w-auto shrink-0 snap-center rounded-[32px] border border-white/10 bg-slate-900/50 p-4.5 shadow-2xl backdrop-blur-2xl flex flex-col space-y-4"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-sm font-black tracking-tight text-white">{col.title}</h3>
                  </div>
                  <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-black text-slate-300">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Tasks Container */}
                <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[68vh] pr-1">
                  {columnTasks.length === 0 ? (
                    <div className="py-14 text-center text-xs font-semibold text-slate-500">
                      No tasks in this stage
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priorityConfig = PRIORITIES.find((p) => p.id === task.priority) || {
                        label: task.priority,
                        badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
                      };
                      const remaining = getRemainingTime(task.dueAt);
                      const isAssignedToMe = task.assignees?.some((a: any) => a.user?.id === currentUserId);
                      return (
                        <div
                          key={task.id}
                          className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm hover:border-purple-400/40 hover:bg-white/[0.07] transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-white tracking-tight leading-snug line-clamp-2">
                              {task.title}
                            </h4>
                            <span
                              className={`shrink-0 rounded-xl border px-2 py-0.5 text-[10px] font-black ${priorityConfig.badge}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Meta Tags: Department & Project */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {task.project && (
                              <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-black text-indigo-300">
                                📁 {task.project.name}
                              </span>
                            )}
                            {task.department && (
                              <span className="rounded-lg bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-black text-purple-300">
                                🏢 {task.department.name}
                              </span>
                            )}
                          </div>

                          {/* Assignees Avatars */}
                          <div className="flex items-center justify-between border-t border-white/[0.07] pt-2.5">
                            <div className="flex items-center -space-x-2 overflow-hidden">
                              {task.assignees?.slice(0, 3).map((assignee: any, idx: number) => (
                                <div
                                  key={idx}
                                  title={assignee.user.name || assignee.user.email}
                                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-[11px] font-black text-white ring-2 ring-slate-900 shadow-sm"
                                >
                                  {assignee.user.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                              ))}
                              {task.assignees?.length > 3 && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-slate-300 ring-2 ring-slate-900">
                                  +{task.assignees.length - 3}
                                </div>
                              )}
                              {task.assignees?.length === 0 && (
                                <span className="text-[11px] font-bold text-slate-500">Unassigned</span>
                              )}
                            </div>

                            {/* SLA Count */}
                            <span
                              suppressHydrationWarning
                              className={`font-mono text-[11px] font-black ${
                                remaining.isOverdue ? "text-rose-400" : "text-slate-400"
                              }`}
                            >
                              {mounted ? remaining.label : "..."}
                            </span>
                          </div>

                          {/* Quick Interactive Actions */}
                          <div className="flex items-center justify-end gap-2 pt-1">
                            {task.status === "ASSIGNED" && isAssignedToMe && (
                              <Button
                                size="sm"
                                onClick={() => handleStartWork(task.id)}
                                className="h-7 text-[10px] font-black rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 cursor-pointer"
                              >
                                ▶ Start
                              </Button>
                            )}

                            {task.status === "IN_PROGRESS" && isAssignedToMe && (
                              <Button
                                size="sm"
                                onClick={() => setSubmitTaskTarget(task)}
                                className="h-7 text-[10px] font-black rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-2.5 cursor-pointer"
                              >
                                📤 Submit
                              </Button>
                            )}

                            <Link href={`/tasks/${task.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-bold rounded-lg border-white/10 bg-white/5 text-slate-300 hover:text-white"
                              >
                                Details →
                              </Button>
                            </Link>
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
      ) : (
        /* ☰ TABLE LIST VIEW (Fallback) */
        <div className="relative z-10 overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-2xl divide-y divide-white/[0.07]">
          {filteredTasks.map((task) => (
            <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 hover:bg-white/[0.03]">
              <div className="space-y-1">
                <span className="font-black text-white text-sm">{task.title}</span>
                <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold text-purple-300 font-mono">Status: {task.status}</span>
                  {task.project && <span className="text-[10px] font-bold text-slate-400">Project: {task.project.name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/tasks/${task.id}`}>
                  <Button size="sm" variant="outline" className="rounded-xl border-white/10 text-xs">
                    View →
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🚀 MODAL: ASSIGN TASK (Multi-Checkbox + Department + SLA) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[36px] border border-white/15 bg-slate-900/95 p-6 md:p-8 shadow-2xl shadow-purple-950/70 backdrop-blur-3xl space-y-6 text-white max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-mono">
                  DISPATCH WORKFLOW
                </span>
                <h3 className="text-2xl font-black text-white tracking-tight mt-0.5">
                  Create New Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-5">
              {/* Task Title */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth Flow & Token Expiry"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Detailed Description</label>
                <textarea
                  rows={2}
                  placeholder="Instructions, expected output, acceptance criteria..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-purple-500 transition"
                />
              </div>

              {/* Assign to Project & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Assign to Project Space</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">General Workspace</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Department Assign</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Checkbox Combined Multi-Assign Members */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Combined Assignees (Check All Who Apply)
                  </label>
                  <span className="text-[11px] font-mono text-purple-300 font-bold">
                    {selectedAssigneeIds.length} Selected
                  </span>
                </div>

                <div className="mt-2 max-h-36 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/60 p-3 space-y-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No team members available</p>
                  ) : (
                    teamMembers.map((member) => {
                      const isChecked = selectedAssigneeIds.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          className={`flex items-center gap-3 p-2 rounded-xl transition cursor-pointer ${
                            isChecked ? "bg-purple-600/20 border border-purple-500/40" : "hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAssignee(member.id)}
                            className="h-4 w-4 rounded-md border-white/20 bg-slate-900 text-purple-600 accent-purple-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-white flex-1">
                            {member.name || member.email}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{member.email}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Priority SLA Window */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">Priority SLA Window</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition cursor-pointer ${
                        newPriority === p.id
                          ? `${p.badge} ring-2 ring-purple-400 scale-[1.03]`
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="text-xs font-black">{p.id}</span>
                      <span className="text-[9px] font-bold opacity-80 mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 font-black text-white shadow-xl shadow-purple-600/30 cursor-pointer"
                >
                  {isSubmitting ? "Deploying..." : "🚀 Deploy Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📤 MODAL: SUBMIT DELIVERABLE */}
      {submitTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-[36px] border border-white/15 bg-slate-900/95 p-7 shadow-2xl backdrop-blur-3xl space-y-4 text-white">
            <h3 className="text-xl font-black">Submit Work Proof</h3>
            <p className="text-xs text-slate-400">Deliverable for: {submitTaskTarget.title}</p>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <textarea
                required
                rows={3}
                placeholder="Proof summary, completion notes, asset links..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3.5 text-xs text-white outline-none focus:border-purple-500"
              />

              <div className="flex justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitTaskTarget(null)}
                  className="rounded-xl border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDelivering}
                  className="rounded-xl bg-emerald-600 text-white font-bold"
                >
                  {isDelivering ? "Submitting..." : "Send Proof"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}