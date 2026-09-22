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
  { id: "P1", label: "P1 • Urgent", desc: "2h Max", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "P2", label: "P2 • 4 Hours", desc: "4h SLA", badge: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "P3", label: "P3 • 8 Hours", desc: "8h SLA", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "P4", label: "P4 • 24 Hours", desc: "24h SLA", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "P5", label: "P5 • 48 Hours", desc: "48h SLA", badge: "bg-slate-100 text-slate-700 border-slate-200" },
];

const KANBAN_COLUMNS = [
  { id: "ASSIGNED", title: "Backlog / Assigned", borderTop: "border-t-purple-500", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800" },
  { id: "IN_PROGRESS", title: "In Progress", borderTop: "border-t-blue-500", dot: "bg-blue-500", badge: "bg-blue-100 text-blue-800" },
  { id: "REVIEW", title: "Review & Proof", borderTop: "border-t-amber-500", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800" },
  { id: "COMPLETED", title: "Done / Approved", borderTop: "border-t-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
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
      {/* 🧭 Top High-Contrast Control Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 rounded-[26px] border border-slate-200/90 bg-white p-3.5 shadow-sm backdrop-blur-xl">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 w-fit">
          <button
            type="button"
            onClick={() => setViewMode("KANBAN")}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-black tracking-wider transition ${
              viewMode === "KANBAN"
                ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ▦ Kanban Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-black tracking-wider transition ${
              viewMode === "LIST"
                ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ☰ List View
          </button>
        </div>

        {/* Right: Search, Project, Priority & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-purple-600 transition"
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
            className="h-9 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none hover:border-slate-300 focus:border-purple-600 transition"
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
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>

          {/* Launch Modal Button */}
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white px-4 shadow-sm shadow-purple-500/25 transition cursor-pointer"
          >
            ✨ Create Task
          </Button>
        </div>
      </div>

      {/* ▦ KANBAN BOARD VIEW */}
      {viewMode === "KANBAN" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => {
              if (col.id === "ASSIGNED") return t.status === "ASSIGNED" || t.status === "DRAFT";
              return t.status === col.id;
            });

            return (
              <div
                key={col.id}
                className={`flex flex-col rounded-[26px] border border-slate-200/90 bg-slate-50/80 p-4 shadow-sm min-h-[580px] border-t-4 ${col.borderTop}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      {col.title}
                    </h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-black font-mono ${col.badge}`}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Tasks Container */}
                <div className="mt-3.5 space-y-3 flex-1 overflow-y-auto pr-0.5 custom-kanban-scroll">
                  {columnTasks.length === 0 ? (
                    <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center">
                      <span className="text-lg opacity-40">☕</span>
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
                      const isAssignedToMe = task.assignees?.some((a: any) => a.user?.id === currentUserId);

                      return (
                        <div
                          key={task.id}
                          className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-300 hover:shadow-md transition-all duration-150 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/tasks/${task.id}`}
                              className="text-xs font-black text-slate-900 group-hover:text-purple-600 line-clamp-2 transition leading-snug"
                            >
                              {task.title}
                            </Link>
                            <span
                              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase ${priorityConfig.badge}`}
                            >
                              {task.priority}
                            </span>
                          </div>

                          {task.description && (
                            <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Meta Tags: Department & Project */}
                          {(task.project || task.department) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {task.project && (
                                <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                  📁 {task.project.name}
                                </span>
                              )}
                              {task.department && (
                                <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                  🏢 {task.department.name}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Assignees Avatars & SLA Time */}
                          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                            <div className="flex items-center -space-x-1.5 overflow-hidden">
                              {task.assignees?.slice(0, 3).map((assignee: any, idx: number) => (
                                <div
                                  key={idx}
                                  title={assignee.user.name || assignee.user.email}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-[10px] font-black text-white ring-2 ring-white shadow-xs"
                                >
                                  {assignee.user.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                              ))}
                              {task.assignees?.length > 3 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-black text-slate-700 ring-2 ring-white">
                                  +{task.assignees.length - 3}
                                </div>
                              )}
                              {task.assignees?.length === 0 && (
                                <span className="text-[10px] font-bold text-slate-400">Unassigned</span>
                              )}
                            </div>

                            <span
                              suppressHydrationWarning
                              className={`font-mono text-[10px] font-black ${
                                remaining.isOverdue ? "text-rose-600 font-extrabold" : "text-slate-400"
                              }`}
                            >
                              {mounted ? remaining.label : "..."}
                            </span>
                          </div>

                          {/* Quick Interactive Actions */}
                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                            {task.status === "ASSIGNED" && isAssignedToMe && (
                              <button
                                type="button"
                                onClick={() => handleStartWork(task.id)}
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-extrabold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                <span>▶</span>
                                <span>Start</span>
                              </button>
                            )}

                            {task.status === "IN_PROGRESS" && isAssignedToMe && (
                              <button
                                type="button"
                                onClick={() => setSubmitTaskTarget(task)}
                                className="flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2 py-1 text-[10px] font-extrabold text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                              >
                                <span>📤</span>
                                <span>Submit</span>
                              </button>
                            )}

                            <Link href={`/tasks/${task.id}`}>
                              <button
                                type="button"
                                className="rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 px-2 py-1 text-[10px] font-extrabold text-slate-600 transition cursor-pointer"
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
        /* ☰ TABLE LIST VIEW */
        <div className="overflow-hidden rounded-[26px] border border-slate-200/90 bg-white shadow-sm divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No tasks found matching this criteria.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-50 transition">
                <div className="space-y-1">
                  <span className="font-black text-slate-900 text-xs">{task.title}</span>
                  {task.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-700 font-mono">
                      {task.status}
                    </span>
                    {task.project && (
                      <span className="text-[10px] font-bold text-slate-500">
                        📁 {task.project.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/tasks/${task.id}`}>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100">
                      View Task →
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 🚀 MODAL: ASSIGN TASK */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 md:p-7 shadow-2xl space-y-5 text-slate-900 max-h-[92vh] overflow-y-auto custom-kanban-scroll">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 font-mono">
                  DISPATCH WORKFLOW
                </span>
                <h3 className="text-xl font-black text-slate-950 tracking-tight mt-0.5">
                  Create New Task
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth Flow & Token Expiry"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1.5 w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Instructions, expected output, acceptance criteria..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Project Space</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-slate-800 outline-none focus:border-purple-600 cursor-pointer"
                  >
                    <option value="">General Workspace</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Department</label>
                  <select
                    value={selectedDepartmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-bold text-slate-800 outline-none focus:border-purple-600 cursor-pointer"
                  >
                    <option value="">No Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Assign Checkbox List */}
              <div>
                <div className="flex items-center justify-between pb-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Assignees
                  </label>
                  <span className="text-[10px] font-mono text-purple-700 font-bold">
                    {selectedAssigneeIds.length} Selected
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-1 custom-kanban-scroll">
                  {teamMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No team members available</p>
                  ) : (
                    teamMembers.map((member) => {
                      const isChecked = selectedAssigneeIds.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          className={`flex items-center gap-2.5 p-2 rounded-lg transition cursor-pointer ${
                            isChecked ? "bg-purple-100/70 border border-purple-200" : "hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAssignee(member.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600 accent-purple-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-800 flex-1">
                            {member.name || member.email}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{member.email}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Priority Selection */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">Priority SLA Window</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1.5">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPriority(p.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition cursor-pointer ${
                        newPriority === p.id
                          ? `${p.badge} ring-2 ring-purple-600 font-black`
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-xs">{p.id}</span>
                      <span className="text-[9px] opacity-75 font-semibold">{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white px-5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Deploying..." : "Deploy Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📤 MODAL: SUBMIT DELIVERABLE */}
      {submitTaskTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900">
            <h3 className="text-lg font-black">Submit Work Proof</h3>
            <p className="text-xs text-slate-500">Deliverable for: {submitTaskTarget.title}</p>

            <form onSubmit={handleSubmitDeliverable} className="space-y-3.5">
              <textarea
                required
                rows={3}
                placeholder="Proof summary, completion notes, asset links..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
              />

              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitTaskTarget(null)}
                  className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isDelivering}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 cursor-pointer"
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