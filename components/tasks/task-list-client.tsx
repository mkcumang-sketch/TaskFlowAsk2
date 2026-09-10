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
  { id: "P1", label: "P1 • Urgent", desc: "Immediate", badge: "bg-rose-600 text-white animate-pulse" },
  { id: "P2", label: "P2 • 4 Hours", desc: "4h SLA", badge: "bg-orange-500 text-white" },
  { id: "P3", label: "P3 • 8 Hours", desc: "8h SLA", badge: "bg-amber-500 text-white" },
  { id: "P4", label: "P4 • 24 Hours", desc: "24h SLA", badge: "bg-blue-600 text-white" },
  { id: "P5", label: "P5 • 48 Hours", desc: "48h SLA", badge: "bg-slate-600 text-white" },
];

function getRemainingTime(dueAt: string | Date | null | undefined): { label: string; isOverdue: boolean } {
  if (!dueAt) return { label: "No SLA", isOverdue: false };
  const diffMs = new Date(dueAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: "SLA Breached", isOverdue: true };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return { label: `${hours}h ${mins}m left`, isOverdue: false };
  return { label: `${mins}m left (Escalating)`, isOverdue: false };
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

  // Create Task Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newPriority, setNewPriority] = useState("P3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit Deliverable Form State
  const [responseNote, setResponseNote] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDelivering, setIsDelivering] = useState(false);

  // Filter & Search
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

  // Handler: Create Task
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

  // Handler: Start Work (Notifies Admin)
  const handleStartWork = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_WORK" }),
      });
      if (res.ok) {
        alert("🚀 Work marked IN_PROGRESS! Manager has been notified.");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Send Response / Deliverable File
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
        alert("✓ Work submitted! Status moved to REVIEW for manager verification.");
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
    <div className="relative z-10 w-full space-y-6 font-sans">
      {/* 🧭 Header Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/80 bg-white/95 p-4 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "ASSIGNED", "IN_PROGRESS", "REVIEW", "COMPLETED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-black tracking-tight transition ${
                statusFilter === st
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 (Urgent)</option>
            <option value="P2">P2 (4 Hours)</option>
            <option value="P3">P3 (8 Hours)</option>
            <option value="P4">P4 (24 Hours)</option>
            <option value="P5">P5 (48 Hours)</option>
          </select>

          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 sm:w-60 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold outline-none focus:border-purple-600 transition shadow-xs"
          />

          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="min-h-[40px] rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-slate-900 px-5 text-xs font-black tracking-wide text-white shadow-lg shadow-purple-500/25 hover:opacity-95 transition active:scale-95 cursor-pointer"
          >
            + Assign Task
          </Button>
        </div>
      </div>

      {/* 📋 Master Task Table */}
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/95 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-slate-400">
          <span>Task Details & Assignee</span>
          <div className="flex items-center gap-8">
            <span>SLA Window</span>
            <span>Priority</span>
            <span>Action</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                📋
              </div>
              <p className="font-bold text-slate-700">No matching tasks found.</p>
              <p className="mt-1">Click &quot;+ Assign Task&quot; above to allocate deliverables.</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const assignedUser = task.assignees?.[0]?.user;
              const isAssignedToMe = assignedUser?.id === currentUserId;
              const priorityConfig = PRIORITIES.find((p) => p.id === task.priority) || {
                label: task.priority,
                badge: "bg-slate-700 text-white",
              };
              const remaining = getRemainingTime(task.dueAt);

              return (
                <div
                  key={task.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4.5 hover:bg-slate-50/90 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-sm text-slate-900 tracking-tight">
                        {task.title}
                      </span>
                      {task.project && (
                        <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                          📁 {task.project.name}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <span className="text-[11px] font-bold text-slate-400">Assigned:</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-800">
                        👤 {assignedUser ? assignedUser.name || assignedUser.email : "Unassigned"}
                      </span>
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-800 uppercase tracking-wider">
                        {task.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <span
                        suppressHydrationWarning
                        className={`font-mono text-xs font-black ${
                          remaining.isOverdue ? "text-rose-600 font-extrabold" : "text-slate-600"
                        }`}
                      >
                        {mounted ? remaining.label : "Loading..."}
                      </span>
                    </div>

                    <span
                      className={`rounded-xl px-3 py-1 text-xs font-black tracking-wide shadow-xs ${priorityConfig.badge}`}
                    >
                      {priorityConfig.label}
                    </span>

                    {/* Role/State Actions */}
                    <div className="flex items-center gap-2">
                      {task.status === "ASSIGNED" && isAssignedToMe && (
                        <Button
                          size="sm"
                          onClick={() => handleStartWork(task.id)}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          ▶ Start Work
                        </Button>
                      )}

                      {task.status === "IN_PROGRESS" && isAssignedToMe && (
                        <Button
                          size="sm"
                          onClick={() => setSubmitTaskTarget(task)}
                          className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-3.5 py-1.5 shadow-sm active:scale-95 cursor-pointer"
                        >
                          📤 Send Response
                        </Button>
                      )}

                      <Link href={`/tasks/${task.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Assign Task to Employee
                </h3>
                <p className="text-xs text-slate-500">
                  Select employee, set deliverable instructions, and select priority SLA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Landing Page Mockup"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold outline-none focus:border-purple-600 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Detailed Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide context, acceptance criteria, or asset links..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-purple-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Assign To</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="">Select Employee...</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name || m.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Project</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700">Priority SLA Window</label>
                <div className="grid grid-cols-5 gap-2 mt-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-center transition cursor-pointer ${
                        newPriority === p.id
                          ? `${p.badge} border-transparent shadow-md scale-105`
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xs font-black">{p.id}</span>
                      <span className="text-[10px] font-semibold opacity-90">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-purple-600 text-white font-black hover:bg-purple-700 shadow-md cursor-pointer"
                >
                  {isSubmitting ? "Assigning..." : "Assign Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📤 MODAL 2: SEND RESPONSE & SUBMIT DELIVERABLES */}
      {submitTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Send Response & Deliverable
                </h3>
                <p className="text-xs text-slate-500">
                  Submitting work for: <strong>{submitTaskTarget.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitTaskTarget(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitDeliverable} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700">Response Summary & Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail your work, output metrics, or handoff notes..."
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-purple-600 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">File Link or URL</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or uploaded asset link"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-purple-600 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Attachment Label</label>
                <input
                  type="text"
                  placeholder="e.g. final-deliverable.pdf or ui-design.fig"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-purple-600 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitTaskTarget(null)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDelivering}
                  className="rounded-xl bg-purple-600 text-white font-black hover:bg-purple-700 shadow-md cursor-pointer"
                >
                  {isDelivering ? "Submitting..." : "Submit Deliverable"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}