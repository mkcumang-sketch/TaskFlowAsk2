"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  createdAt?: string | Date | null;
  projectId?: string | null;
  project?: ProjectItem | null;
  departmentId?: string | null;
  department?: DepartmentItem | null;
  assignees: Array<{ user: UserItem; userId?: string }>;
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
  { id: "P1", label: "P1 • Urgent", desc: "2h SLA", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "P2", label: "P2 • 4 Hours", desc: "4h SLA", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "P3", label: "P3 • 8 Hours", desc: "8h SLA", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "P4", label: "P4 • 24 Hours", desc: "24h SLA", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "P5", label: "P5 • 48 Hours", desc: "48h SLA", badge: "bg-slate-100 text-slate-700 border-slate-200" },
];

const KANBAN_COLUMNS = [
  { id: "ASSIGNED", title: "Backlog / Awaiting Accept", borderTop: "border-t-purple-500", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800" },
  { id: "IN_PROGRESS", title: "Accepted & Working", borderTop: "border-t-blue-500", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  { id: "REVIEW", title: "Review & Proof Submitted", borderTop: "border-t-amber-500", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  { id: "COMPLETED", title: "Done / Approved", borderTop: "border-t-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
];

function getRemainingTime(dueAt: string | Date | null | undefined): { label: string; isOverdue: boolean; isUrgent: boolean } {
  if (!dueAt) return { label: "No SLA Limit", isOverdue: false, isUrgent: false };
  const diffMs = new Date(dueAt).getTime() - Date.now();
  if (diffMs <= 0) return { label: "SLA BREACHED", isOverdue: true, isUrgent: true };

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const isUrgent = diffMs < 30 * 60 * 1000;

  if (hours > 0) return { label: `${hours}h ${mins}m left`, isOverdue: false, isUrgent };
  return { label: `${mins}m left`, isOverdue: false, isUrgent: true };
}

export function TaskListClient({
  initialTasks = [],
  projects = [],
  departments = [],
  teamMembers = [],
  currentUserId,
}: TaskListClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"KANBAN" | "LIST">("KANBAN");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitTaskTarget, setSubmitTaskTarget] = useState<TaskItem | null>(null);
  const [holdTaskTarget, setHoldTaskTarget] = useState<TaskItem | null>(null);

  // Create Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newPriority, setNewPriority] = useState("P3");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deliverable Submission Form State
  const [responseNote, setResponseNote] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);

  // Hold State
  const [holdReason, setHoldReason] = useState("");
  const [isHolding, setIsHolding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setMounted((prev) => !prev), 30000);
    return () => clearInterval(timer);
  }, []);

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

  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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
        alert(err.error || "Task create nahi ho saka.");
      }
    } catch {
      alert("Network error creating task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT_TASK" }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Task accept nahi ho saka.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleHoldTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdTaskTarget || !holdReason.trim() || isHolding) return;
    setIsHolding(true);

    try {
      const res = await fetch(`/api/tasks/${holdTaskTarget.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "HOLD_TASK",
          holdReason: holdReason.trim(),
        }),
      });

      if (res.ok) {
        setHoldTaskTarget(null);
        setHoldReason("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Task hold nahi ho saka.");
      }
    } finally {
      setIsHolding(false);
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTaskTarget || (!responseNote.trim() && !externalLink.trim() && !attachedFile) || isDelivering) return;
    setIsDelivering(true);

    try {
      let uploadedUrl: string | null = null;
      let uploadedName: string | null = null;

      // Handle universal document / voice upload
      if (attachedFile) {
        const formData = new FormData();
        formData.append("file", attachedFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedUrl = uploadData.url;
          uploadedName = uploadData.fileName || attachedFile.name;
        }
      }

      const res = await fetch(`/api/tasks/${submitTaskTarget.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT_WORK",
          feedback: responseNote.trim(),
          externalLink: externalLink.trim(),
          proofUrl: uploadedUrl,
          proofName: uploadedName,
        }),
      });

      if (res.ok) {
        setSubmitTaskTarget(null);
        setResponseNote("");
        setExternalLink("");
        setAttachedFile(null);
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Submission failed");
      }
    } catch {
      alert("Network error submitting deliverable");
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <div className="w-full space-y-4 font-sans select-none overflow-hidden">
      {/* 📱 Mobile Optimized Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewMode("KANBAN")}
            className={`flex-1 sm:flex-none cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black tracking-wider transition ${
              viewMode === "KANBAN"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ▦ Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`flex-1 sm:flex-none cursor-pointer rounded-lg px-3 py-1.5 text-xs font-black tracking-wider transition ${
              viewMode === "LIST"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ☰ List
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex-1 sm:flex-none h-8.5 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-purple-600"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1">P1 • 2h SLA</option>
            <option value="P2">P2 • 4h SLA</option>
            <option value="P3">P3 • 8h SLA</option>
            <option value="P4">P4 • 24h</option>
            <option value="P5">P5 • 48h</option>
          </select>

          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 sm:w-44 h-8.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white"
          />

          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-8.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white px-3 cursor-pointer shadow-xs"
          >
            + Task
          </Button>
        </div>
      </div>

      {/* ▦ KANBAN BOARD */}
      {viewMode === "KANBAN" ? (
        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory xl:grid xl:grid-cols-4 xl:overflow-visible custom-kanban-scroll">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => {
              if (col.id === "ASSIGNED") return t.status === "ASSIGNED" || t.status === "DRAFT";
              return t.status === col.id;
            });

            return (
              <div
                key={col.id}
                className={`w-[85vw] sm:w-[310px] xl:w-auto shrink-0 snap-center flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-xs border-t-4 ${col.borderTop} h-[calc(100vh-230px)] min-h-[460px] max-h-[700px]`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 px-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {col.title}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.2 text-[10px] font-black font-mono ${col.badge}`}>
                    {columnTasks.length}
                  </span>
                </div>

                <div className="mt-2.5 space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-kanban-scroll">
                  {columnTasks.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center">
                      <span className="text-base opacity-40">☕</span>
                      <span className="mt-1 text-xs font-bold text-slate-400">
                        No tasks in this stage
                      </span>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priorityConfig = PRIORITIES.find((p) => p.id === task.priority) || {
                        label: task.priority,
                        badge: "bg-slate-100 text-slate-700 border-slate-200",
                      };
                      const remaining = getRemainingTime(task.dueAt);
                      const isAssignedToMe = task.assignees?.some(
                        (a: any) => a.userId === currentUserId || a.user?.id === currentUserId
                      );
                      const isAccepted = task.status === "IN_PROGRESS" || Boolean(task.startAt);

                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border bg-white p-3 shadow-xs transition hover:border-purple-300 space-y-2 ${
                            remaining.isOverdue && isAccepted
                              ? "border-rose-400 ring-1 ring-rose-300"
                              : "border-slate-200"
                          }`}
                        >
                          {/* Header: Status Pill & Priority */}
                          <div className="flex items-center justify-between gap-1.5">
                            {isAccepted ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Accepted • Working
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700 border border-amber-200">
                                ⏳ Pending Accept
                              </span>
                            )}

                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${priorityConfig.badge}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          <Link
                            href={`/tasks/${task.id}`}
                            className="block text-xs font-black text-slate-900 hover:text-purple-600 line-clamp-2 leading-snug"
                          >
                            {task.title}
                          </Link>

                          {task.description && (
                            <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed whitespace-pre-line">
                              {task.description}
                            </p>
                          )}

                          {/* Countdown SLA Timer */}
                          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-2 py-1 border border-slate-100">
                            <span className="text-[9px] font-bold text-slate-500">⏱️ SLA Timer:</span>
                            <span
                              className={`font-mono text-[9px] font-black ${
                                remaining.isOverdue
                                  ? "text-rose-600 font-extrabold animate-pulse"
                                  : remaining.isUrgent
                                  ? "text-amber-600 font-black"
                                  : "text-slate-700"
                              }`}
                            >
                              {isAccepted ? remaining.label : "Starts on accept"}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                            {/* 1. Accept Task */}
                            {(task.status === "ASSIGNED" || task.status === "DRAFT") && isAssignedToMe && (
                              <button
                                type="button"
                                onClick={() => handleAcceptTask(task.id)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-emerald-700 cursor-pointer shadow-xs active:scale-95 transition"
                              >
                                ⚡ Accept
                              </button>
                            )}

                            {/* 2. Hold / Preempt */}
                            {task.status === "IN_PROGRESS" && isAssignedToMe && (
                              <button
                                type="button"
                                onClick={() => setHoldTaskTarget(task)}
                                className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-black text-amber-700 hover:bg-amber-100 cursor-pointer"
                                title="Hold for urgent P1"
                              >
                                ⏸️ Hold
                              </button>
                            )}

                            {/* 3. Submit Deliverable with Any Format Proof */}
                            {task.status === "IN_PROGRESS" && isAssignedToMe && (
                              <button
                                type="button"
                                onClick={() => setSubmitTaskTarget(task)}
                                className="rounded-lg bg-purple-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-purple-700 cursor-pointer shadow-xs active:scale-95 transition"
                              >
                                📤 Submit Proof
                              </button>
                            )}

                            <Link href={`/tasks/${task.id}`}>
                              <button
                                type="button"
                                className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 cursor-pointer"
                              >
                                Details →
                              </button>
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
        /* ☰ LIST VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs divide-y divide-slate-100">
          {filteredTasks.map((task) => {
            const remaining = getRemainingTime(task.dueAt);
            const isAccepted = task.status === "IN_PROGRESS" || Boolean(task.startAt);

            return (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-xs">{task.title}</span>
                    {isAccepted ? (
                      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-black text-emerald-700 border border-emerald-200">
                        Accepted
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700 border border-amber-200">
                        Unaccepted
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold ${remaining.isOverdue ? "text-rose-600" : "text-slate-500"}`}>
                    {isAccepted ? remaining.label : "Pending Accept"}
                  </span>
                  <Link href={`/tasks/${task.id}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      View →
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📤 UNIVERSAL PROOF SUBMISSION MODAL (Voice, PDF, Docs, Link, Description) */}
      {submitTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="relative w-full max-w-lg rounded-2xl md:rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-kanban-scroll">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 font-mono">
                  PROOF OF WORK
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Submit Deliverable Proof
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSubmitTaskTarget(null)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Task: <strong className="text-slate-900">{submitTaskTarget.title}</strong>
            </p>

            <form onSubmit={handleSubmitDeliverable} className="space-y-3.5">
              {/* 1. Description */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700">
                  Deliverable Summary & Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail what was completed, key highlights, or execution results..."
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              {/* 2. Universal File / Voice / PDF / Any Document Upload */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700 flex items-center justify-between">
                  <span>Attach Document / Voice Note (Any Format)</span>
                  <span className="text-[10px] text-purple-600 font-bold">100% Free</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="*/*" // Accepts PDF, DOCX, XLSX, MP3, WAV, ZIP, Images etc.
                  onChange={(e) => {
                    if (e.target.files?.[0]) setAttachedFile(e.target.files[0]);
                  }}
                />

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/60 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                  >
                    <span>📎 Upload PDF / Voice / Doc</span>
                  </button>

                  {attachedFile && (
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
                      <span>📄 {attachedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-rose-600 hover:text-rose-800 ml-1 font-black cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. External Deliverable URL */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700">
                  External Deliverable Link (Drive / Figma / Loom / GitHub)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or Figma link"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitTaskTarget(null)}
                  className="rounded-xl border-slate-200 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDelivering || (!responseNote.trim() && !externalLink.trim() && !attachedFile)}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 cursor-pointer"
                >
                  {isDelivering ? "Uploading Proof..." : "Send Proof to Review"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⏸️ HOLD MODAL */}
      {holdTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3.5">
            <h3 className="text-base font-black text-slate-900">Hold / Carry Forward Task</h3>
            <p className="text-xs text-slate-500">Task: {holdTaskTarget.title}</p>
            <form onSubmit={handleHoldTask} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Why is this being put on hold? (e.g. Taking urgent P1 task)..."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-amber-600"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setHoldTaskTarget(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isHolding} className="bg-amber-600 text-white text-xs font-black">
                  {isHolding ? "Holding..." : "Confirm Hold"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <input
                required
                type="text"
                placeholder="Title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-xs"
              />
              <textarea
                rows={2}
                placeholder="Description..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 px-2 text-xs"
                >
                  <option value="">No Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 px-2 text-xs"
                >
                  <option value="">No Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setNewPriority(p.id)}
                    className={`p-1.5 rounded-lg border text-center text-xs font-bold ${
                      newPriority === p.id ? "bg-purple-600 text-white" : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-purple-600 text-white text-xs font-black">
                  {isSubmitting ? "Deploying..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}