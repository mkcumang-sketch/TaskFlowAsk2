"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardClientProps {
  metrics: {
    totalTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    reviewTasks: number;
    overdueTasks: number;
    completionRate: number;
  };
  tasks: any[];
  employeeKPIs: any[];
  departments: any[];
  recentActivity: any[];
  currentUserId: string;
  currentUserRole: string;
}

export function DashboardClient({
  metrics,
  tasks,
  employeeKPIs,
  departments,
  recentActivity,
  currentUserId,
  currentUserRole,
}: DashboardClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "KPIS" | "DEPARTMENT">("OVERVIEW");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Quick Task Form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("P2");
  const [taskAssignee, setTaskAssignee] = useState("");

  // Urgent Broadcast Form
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const isPrivileged = ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"].includes(
    currentUserRole.toUpperCase()
  );

  // Quick Create Handler
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          priority: taskPriority,
          assigneeId: taskAssignee || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setTaskTitle("");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Broadcast Alert Popup Handler
  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setIsBroadcasting(true);

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broadcast: true,
          title: `🚨 EMERGENCY: ${broadcastTitle.trim()}`,
          content: broadcastMessage.trim(),
          category: "APPROVALS",
          priority: "URGENT",
        }),
      });

      if (res.ok) {
        setShowBroadcastModal(false);
        setBroadcastTitle("");
        setBroadcastMessage("");
        alert("Broadcast notification successfully sent to entire organization!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="w-full space-y-7 font-sans select-none">
      {/* 🧭 Top Banner: Aurora Metallic Command Ribbon */}
      <div className="relative overflow-hidden rounded-[36px] border border-white/80 bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 p-6 md:p-8 shadow-2xl text-white">
        {/* Glow Spheres */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-purple-600/30 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-12 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-widest text-purple-300">
                Live Operations Engine
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Executive Intelligence & KPI Command
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-300">
              Manage organization throughput, track employee performance scores, and dispatch workflow mandates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="h-11 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 px-5 text-xs font-black text-white shadow-lg shadow-purple-500/30 hover:from-purple-600 hover:to-indigo-600 transition cursor-pointer"
            >
              + Create New Task
            </Button>

            {isPrivileged && (
              <Button
                onClick={() => setShowBroadcastModal(true)}
                variant="outline"
                className="h-11 rounded-2xl border-rose-500/50 bg-rose-500/10 px-5 text-xs font-black text-rose-300 hover:bg-rose-500/20 hover:text-white transition cursor-pointer shadow-lg"
              >
                🚨 Broadcast Task Alert
              </Button>
            )}
          </div>
        </div>

        {/* View Switcher Ribbon */}
        <div className="mt-6 flex gap-2 border-t border-white/10 pt-4">
          {[
            { id: "OVERVIEW", label: "📊 Operations Overview" },
            { id: "KPIS", label: "🎯 Team & Employee KPIs" },
            { id: "DEPARTMENT", label: "🏢 Department Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-slate-950 shadow-md scale-102"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ▦ SECTION 1: OPERATIONS OVERVIEW */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-7">
          {/* Neon Metric Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                title: "Total Tasks",
                value: metrics.totalTasks,
                subtitle: "Active workspace",
                cardClass: "border-purple-200/80 bg-gradient-to-b from-purple-50/70 to-white",
                textClass: "text-purple-900",
                badge: "Total",
                badgeColor: "bg-purple-100 text-purple-800",
              },
              {
                title: "In Progress",
                value: metrics.inProgressTasks,
                subtitle: "Work in flight",
                cardClass: "border-sky-200/80 bg-gradient-to-b from-sky-50/70 to-white",
                textClass: "text-sky-900",
                badge: "Active",
                badgeColor: "bg-sky-100 text-sky-800",
              },
              {
                title: "Review & Signoff",
                value: metrics.reviewTasks,
                subtitle: "Awaiting approval",
                cardClass: "border-amber-200/80 bg-gradient-to-b from-amber-50/70 to-white",
                textClass: "text-amber-900",
                badge: "Pending",
                badgeColor: "bg-amber-100 text-amber-800",
              },
              {
                title: "Completed",
                value: metrics.completedTasks,
                subtitle: "Approved outputs",
                cardClass: "border-emerald-200/80 bg-gradient-to-b from-emerald-50/70 to-white",
                textClass: "text-emerald-900",
                badge: "Done",
                badgeColor: "bg-emerald-100 text-emerald-800",
              },
              {
                title: "Overdue Breaches",
                value: metrics.overdueTasks,
                subtitle: "Action required",
                cardClass: "border-rose-200/80 bg-gradient-to-b from-rose-50/70 to-white",
                textClass: "text-rose-900",
                badge: "Breached",
                badgeColor: "bg-rose-100 text-rose-800",
              },
            ].map((card, idx) => (
              <div
                key={idx}
                className={`rounded-[30px] border-2 p-5 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${card.cardClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    {card.title}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>
                <div className={`mt-3 text-4xl font-black tracking-tight ${card.textClass}`}>
                  {card.value}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-400">{card.subtitle}</p>
              </div>
            ))}
          </div>

          {/* Main Grid: Live Tasks vs Quick Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Task Stream (8 Cols) */}
            <div className="lg:col-span-8 rounded-[34px] border border-slate-200 bg-white/95 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Active Tasks Stream
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Recent tasks with assigned owners, status tags, and deadlines.
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="text-xs font-black text-purple-700 hover:text-purple-900 transition"
                >
                  View full list →
                </Link>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-400 font-bold">
                    No active tasks found in this organization.
                  </div>
                ) : (
                  tasks.slice(0, 10).map((t) => {
                    const assignee = t.assignees?.[0]?.user;
                    return (
                      <div
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-purple-200 hover:bg-white hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase text-white ${
                              t.priority === "P1"
                                ? "bg-rose-500 animate-pulse"
                                : t.priority === "P2"
                                ? "bg-orange-500"
                                : "bg-purple-600"
                            }`}
                          >
                            {t.priority}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate max-w-[240px] sm:max-w-md">
                              {t.title}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400">
                              {t.project ? `📁 ${t.project.name} • ` : ""}
                              Owner: {assignee?.name || assignee?.email?.split("@")[0] || "Unassigned"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-xl bg-white px-3 py-1 text-[11px] font-black text-slate-700 shadow-2xs border border-slate-200">
                            {t.status}
                          </span>
                          <Link href={`/tasks/${t.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs text-purple-700 font-black">
                              Manage →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* At A Glance Gauge Panel (4 Cols) */}
            <div className="lg:col-span-4 rounded-[34px] border border-slate-200 bg-white/95 p-6 shadow-xl space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 tracking-tight">At a Glance</h3>
                <p className="text-xs text-slate-500 font-medium">Core productivity benchmarks</p>
              </div>

              {/* Completion Gauge */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-700">
                  <span>Organization Completion Rate</span>
                  <span className="text-purple-700 font-mono text-sm">{metrics.completionRate}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    style={{ width: `${metrics.completionRate}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-emerald-500 transition-all duration-700"
                  />
                </div>
              </div>

              {/* Team Workload */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Active Workload Capacity</span>
                  <span className="text-xs font-black text-emerald-600">Optimal</span>
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {metrics.inProgressTasks + metrics.reviewTasks} In Flight
                </p>
              </div>

              {/* Recent Audit Timeline */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Audit Activity
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="text-[11px] text-slate-600 border-l-2 border-purple-400 pl-2 py-0.5">
                      <span className="font-bold text-slate-900">{log.user?.name || "System"}:</span>{" "}
                      {log.details || log.action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ▦ SECTION 2: TEAM & EMPLOYEE KPI PERFORMANCE REPORTS */}
      {activeTab === "KPIS" && (
        <div className="rounded-[36px] border border-slate-200 bg-white p-6 md:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Individual & Team Performance League
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Calculated dynamically via completed throughput, SLA adherence, and overdue resolution time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {employeeKPIs.map((emp) => (
              <div
                key={emp.id}
                className="rounded-3xl border border-slate-200/90 bg-slate-50/60 p-5 space-y-4 hover:border-purple-300 hover:bg-white hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-purple-500/25">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{emp.name}</h4>
                      <span className="text-xs font-bold text-slate-400">
                        {emp.department} • {emp.role}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-black text-purple-700 font-mono">
                      {emp.performanceScore}%
                    </span>
                    <p className="text-[10px] font-bold text-slate-400">Efficiency</p>
                  </div>
                </div>

                {/* Performance Progress */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      style={{ width: `${emp.performanceScore}%` }}
                      className={`h-full rounded-full ${
                        emp.performanceScore > 80
                          ? "bg-emerald-500"
                          : emp.performanceScore > 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3 text-center">
                  <div className="rounded-xl bg-white p-2 shadow-2xs border border-slate-100">
                    <span className="text-xs font-black text-slate-900">{emp.totalTasks}</span>
                    <p className="text-[10px] font-bold text-slate-400">Assigned</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 shadow-2xs border border-slate-100">
                    <span className="text-xs font-black text-emerald-600">{emp.completedTasks}</span>
                    <p className="text-[10px] font-bold text-slate-400">Done</p>
                  </div>
                  <div className="rounded-xl bg-white p-2 shadow-2xs border border-slate-100">
                    <span className="text-xs font-black text-rose-600">{emp.overdueTasks}</span>
                    <p className="text-[10px] font-bold text-slate-400">Breached</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ▦ SECTION 3: DEPARTMENT ANALYTICS */}
      {activeTab === "DEPARTMENT" && (
        <div className="rounded-[36px] border border-slate-200 bg-white p-6 md:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Department Operations & Resource Allocation
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium">
              Task distribution, departmental headcount, and team velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">{dept.name}</h4>
                  <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-800">
                    Dept
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2 border-t border-slate-200/60">
                  <span>Headcount: {dept._count?.users || 0} Members</span>
                  <span>Tasks: {dept._count?.tasks || 0} Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚀 MODAL: Create New Task Directly from Dashboard */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Create Task</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickCreate} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct review audit..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Priority SLA</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="P1">P1 • Urgent (1h)</option>
                    <option value="P2">P2 • High (4h)</option>
                    <option value="P3">P3 • Normal (8h)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Assignee</label>
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs font-semibold outline-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {employeeKPIs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 text-white font-bold">
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚨 MODAL: Broadcast Urgent Alert to All Employees */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚨</span>
                <h3 className="text-base font-black text-rose-900">Broadcast Task Emergency</h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This broadcasts an immediate in-app priority alert to every teammate across the organization.
            </p>

            <form onSubmit={handleBroadcastAlert} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700">Alert Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical Bug Hotfix Required"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Directive / Instructions *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Specify immediate required action and deliverable deadline..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowBroadcastModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isBroadcasting}
                  className="bg-rose-600 text-white font-black hover:bg-rose-700 shadow-md cursor-pointer"
                >
                  {isBroadcasting ? "Dispatching..." : "Send Company Broadcast"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}