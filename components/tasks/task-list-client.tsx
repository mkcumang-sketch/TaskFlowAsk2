"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | Date | null;
  startAt?: string | Date | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  assignees: Array<{ user: { id: string; name: string | null; email: string } }>;
  subtasks: Array<{ id: string; title: string; completed: boolean }>;
}

interface TaskListClientProps {
  initialTasks: any[];
  projects: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string | null; email: string }>;
  currentUserId: string;
}

const PRIORITIES = [
  { id: "P1", label: "P1 • Critical", desc: "Immediate", badge: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20 shadow-sm" },
  { id: "P2", label: "P2 • 4 Hours", desc: "4h SLA", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20 shadow-sm" },
  { id: "P3", label: "P3 • 8 Hours", desc: "8h SLA", badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-indigo-500/20 shadow-sm" },
  { id: "P4", label: "P4 • 24 Hours", desc: "24h SLA", badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/20 shadow-sm" },
  { id: "P5", label: "P5 • 48 Hours", desc: "48h SLA", badge: "bg-slate-500/20 text-slate-300 border-slate-500/40 shadow-slate-500/20 shadow-sm" },
];

function getRemainingTime(dueAt: string | Date | null | undefined): { label: string; isOverdue: boolean } {
  if (!dueAt) return { label: "No SLA Limit", isOverdue: false };
  const diffMs = new Date(dueAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: "SLA Breached", isOverdue: true };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return { label: `${hours}h ${mins}m left`, isOverdue: false };
  return { label: `${mins}m left (Critical)`, isOverdue: false };
}

export function TaskListClient({
  initialTasks = [],
  projects = [],
  teamMembers = [],
  currentUserId,
}: TaskListClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitTaskTarget, setSubmitTaskTarget] = useState<TaskItem | null>(null);

  // Form State: Create Task
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newPriority, setNewPriority] = useState("P3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Submit Deliverable
  const [responseNote, setResponseNote] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDelivering, setIsDelivering] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  useEffect(() => {
    setMounted(true);
    fetch("/api/tasks/escalate", { method: "POST" }).catch(() => {});
  }, []);

  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.title?.toLowerCase().includes(q) ||
          task.project?.name?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [initialTasks, statusFilter, priorityFilter, searchQuery]);

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
          assigneeId: newAssigneeId || undefined,
          projectId: newProjectId || undefined,
          priority: newPriority,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewAssigneeId("");
        setNewProjectId("");
        setNewPriority("P3");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign task");
      }
    } catch (err) {
      console.error(err);
      alert("Network error creating task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartWork = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_WORK" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTaskTarget || isDelivering) return;
    setIsDelivering(true);

    try {
      const res = await fetch(`/api/tasks/${submitTaskTarget.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_WORK",
          responseNote,
          fileUrl,
          fileName: fileName || "deliverable-submission",
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full space-y-7 font-sans select-none">
      {/* 🔮 Background Ambient Aurora Spheres */}
      <div className="pointer-events-none absolute -top-16 -left-12 h-96 w-96 rounded-full bg-gradient-to-tr from-purple-600/20 via-indigo-500/15 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 -right-16 h-[440px] w-[440px] rounded-full bg-gradient-to-bl from-indigo-600/20 via-fuchsia-600/15 to-transparent blur-[150px]" />

      {/* 🧭 Glowing Glass Controller Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-slate-900/60 p-4.5 shadow-2xl shadow-purple-950/30 backdrop-blur-2xl">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          {["ALL", "ASSIGNED", "IN_PROGRESS", "REVIEW", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`relative cursor-pointer rounded-xl px-4 py-2 text-xs font-black tracking-wider transition-all duration-200 ${
                statusFilter === st
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-white/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Filter Controls & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-xs font-black text-slate-200 outline-none backdrop-blur-md focus:border-purple-500/50 transition shadow-inner"
          >
            <option value="ALL" className="bg-slate-900 text-white">All Priorities</option>
            <option value="P1" className="bg-slate-900 text-rose-300">P1 • Urgent</option>
            <option value="P2" className="bg-slate-900 text-amber-300">P2 • 4 Hours</option>
            <option value="P3" className="bg-slate-900 text-indigo-300">P3 • 8 Hours</option>
            <option value="P4" className="bg-slate-900 text-cyan-300">P4 • 24 Hours</option>
            <option value="P5" className="bg-slate-900 text-slate-300">P5 • 48 Hours</option>
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-64 h-11 rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-xs font-bold text-white placeholder-slate-500 outline-none backdrop-blur-md focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition shadow-inner"
            />
            <span className="absolute right-3.5 top-3 text-slate-500 text-xs">⚡</span>
          </div>

          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="group relative h-11 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 px-6 text-xs font-black text-white shadow-xl shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/20 cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
            <span className="flex items-center gap-1.5">
              <span>✨</span>
              <span>Assign Task</span>
            </span>
          </Button>
        </div>
      </div>

      {/* ▦ Master Holographic Deliverables Table */}
      <div className="relative z-10 overflow-hidden rounded-[38px] border border-white/10 bg-slate-900/60 shadow-2xl shadow-purple-950/40 backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-8 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">
          <span>Deliverable Spec & Owner</span>
          <div className="flex items-center gap-12">
            <span>SLA Horizon</span>
            <span>Priority</span>
            <span>Actions</span>
          </div>
        </div>

        <div className="divide-y divide-white/[0.07]">
          {filteredTasks.length === 0 ? (
            <div className="py-28 text-center text-xs text-slate-400">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-2xl text-purple-300 shadow-inner">
                🔮
              </div>
              <p className="text-base font-black text-slate-200">No active deliverables in this view</p>
              <p className="mt-1 text-xs text-slate-400">Click &ldquo;+ Assign Task&rdquo; to deploy workload across agents.</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const assignedUser = task.assignees?.[0]?.user;
              const isAssignedToMe = assignedUser?.id === currentUserId;
              const priorityConfig = PRIORITIES.find((p) => p.id === task.priority) || {
                label: task.priority,
                badge: "bg-slate-500/20 text-slate-300 border-slate-500/40",
              };
              const remaining = getRemainingTime(task.dueAt);

              return (
                <div
                  key={task.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-5 px-8 py-5 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-white tracking-tight group-hover:text-purple-300 transition-colors">
                        {task.title}
                      </span>
                      {task.project && (
                        <span className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-black text-purple-300 uppercase tracking-wider">
                          📁 {task.project.name}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-0.5 text-[11px] font-bold text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>{assignedUser ? assignedUser.name || assignedUser.email : "Unassigned"}</span>
                      </span>
                      <span className="rounded-full border border-purple-500/30 bg-purple-950/40 px-3 py-0.5 text-[10px] font-black text-purple-300 uppercase tracking-widest font-mono">
                        {task.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-7 shrink-0">
                    {/* SLA Horizon */}
                    <div className="text-right">
                      <span
                        suppressHydrationWarning
                        className={`inline-flex items-center gap-1.5 font-mono text-xs font-black ${
                          remaining.isOverdue
                            ? "text-rose-400 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                            : "text-slate-300"
                        }`}
                      >
                        {remaining.isOverdue && "⚠️ "}
                        {mounted ? remaining.label : "Syncing..."}
                      </span>
                    </div>

                    {/* Priority Badge */}
                    <span
                      className={`rounded-2xl border px-3.5 py-1 text-xs font-black uppercase tracking-wider ${priorityConfig.badge}`}
                    >
                      {priorityConfig.label}
                    </span>

                    {/* Action Triggers */}
                    <div className="flex items-center gap-2">
                      {task.status === "ASSIGNED" && isAssignedToMe && (
                        <Button
                          size="sm"
                          onClick={() => handleStartWork(task.id)}
                          className="rounded-xl border border-emerald-500/40 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer transition"
                        >
                          ▶ Start Work
                        </Button>
                      )}

                      {task.status === "IN_PROGRESS" && isAssignedToMe && (
                        <Button
                          size="sm"
                          onClick={() => setSubmitTaskTarget(task)}
                          className="rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black px-4 py-2 shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer transition"
                        >
                          📤 Send Response
                        </Button>
                      )}

                      <Link href={`/tasks/${task.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/20 transition"
                        >
                          Details →
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 🚀 MODAL 1: ASSIGN TASK TO EMPLOYEE */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[36px] border border-white/15 bg-slate-900/95 p-7 shadow-2xl shadow-purple-950/60 backdrop-blur-3xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 font-mono">
                  TASK DISPATCH
                </span>
                <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
                  Assign Task to Employee
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design High-Conversion Landing Page"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Acceptance criteria, asset links, or specific constraints..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Assign To</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">Select Employee...</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900">
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Project</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 text-xs font-bold text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority SLA Selection */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Priority SLA Window</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                        newPriority === p.id
                          ? `${p.badge} ring-2 ring-purple-400 scale-105`
                          : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="text-xs font-black">{p.id}</span>
                      <span className="text-[9px] font-bold opacity-80 mt-0.5">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black px-6 shadow-xl shadow-purple-600/30 cursor-pointer transition active:scale-95"
                >
                  {isSubmitting ? "Dispatching..." : "✨ Assign Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📤 MODAL 2: SEND RESPONSE & SUBMIT DELIVERABLES */}
      {submitTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[36px] border border-white/15 bg-slate-900/95 p-7 shadow-2xl shadow-purple-950/60 backdrop-blur-3xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono">
                  VERIFICATION PROOF
                </span>
                <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
                  Send Response & Deliverable
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Submitting work for: <strong className="text-purple-300">{submitTaskTarget.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitTaskTarget(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Response Summary & Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail your work, output metrics, or handoff notes..."
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs font-medium text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">File Link or Deliverable URL</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or Figma link"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Attachment Label</label>
                <input
                  type="text"
                  placeholder="e.g. final-deliverable.pdf or production-v1"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitTaskTarget(null)}
                  className="rounded-2xl border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDelivering}
                  className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-6 shadow-xl shadow-emerald-600/30 cursor-pointer transition active:scale-95"
                >
                  {isDelivering ? "Submitting..." : "🚀 Submit Deliverable"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}