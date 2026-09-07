"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export interface SPCounterData {
  today: number;
  inbox: number;
  urgent: number;
  habits: number;
  teamPool: number;
}

interface SPSidebarProps {
  initialCounts?: Partial<SPCounterData>;
  userRole?: string;
  userName?: string;
}

export function SPSidebar({ initialCounts, userRole = "EMPLOYEE", userName }: SPSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [counts, setCounts] = useState<SPCounterData>({
    today: initialCounts?.today ?? 0,
    inbox: initialCounts?.inbox ?? 0,
    urgent: initialCounts?.urgent ?? 0,
    habits: initialCounts?.habits ?? 0,
    teamPool: initialCounts?.teamPool ?? 0,
  });

  const [collapsed, setCollapsed] = useState(false);

  // Poll badge counters every 30 seconds
  useEffect(() => {
    let isMounted = true;

    async function fetchCounters() {
      try {
        const res = await fetch("/api/sp/counters");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCounts(data);
          }
        }
      } catch (err) {
        console.error("Counter sync error:", err);
      }
    }

    fetchCounters();
    const interval = setInterval(fetchCounters, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        router.push("/today");
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        router.push("/inbox");
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        router.push("/planner");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const navItem = (
    href: string,
    label: string,
    icon: string,
    badgeValue?: number,
    badgeColor: string = "bg-slate-100 text-slate-700"
  ) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");

    return (
      <Link
        href={href}
        className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ${
          isActive
            ? "bg-slate-900 text-white shadow-xs"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
        title={collapsed ? label : undefined}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="text-sm shrink-0">{icon}</span>
          {!collapsed && <span className="truncate">{label}</span>}
        </div>

        {!collapsed && typeof badgeValue === "number" && badgeValue > 0 && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
              isActive ? "bg-slate-800 text-white" : badgeColor
            }`}
          >
            {badgeValue > 99 ? "99+" : badgeValue}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`relative flex flex-col justify-between border-r border-slate-200 bg-white p-3.5 transition-all duration-200 select-none ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="space-y-4">
        {/* Header / Brand */}
        <div className="flex items-center justify-between px-1 py-1">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">
                TF
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold leading-tight text-slate-900">TaskFlow</span>
                <span className="text-[9px] font-medium tracking-wide uppercase text-purple-600">
                  Super Productivity
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Primary Views Section */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Workspace
            </div>
          )}
          {navItem("/today", "Today", "☀️", counts.today, "bg-amber-100 text-amber-800")}
          {navItem("/inbox", "Inbox", "📥", counts.inbox, "bg-blue-100 text-blue-800")}
          {navItem("/planner", "Planner", "📋")}
          {navItem("/schedule", "Schedule", "⏰")}
          {navItem("/tasks", "All Tasks", "✓", counts.urgent, "bg-red-100 text-red-800")}
        </div>

        {/* Visual Workflows */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Visual Boards
            </div>
          )}
          {navItem("/boards/kanban", "Kanban Board", "▦")}
          {navItem("/boards/eisenhower", "Eisenhower Matrix", "🗂️")}
        </div>

        {/* Systems & Routines */}
        <div className="space-y-1">
          {!collapsed && (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Execution
            </div>
          )}
          {navItem("/habits", "Habits", "🌱", counts.habits, "bg-emerald-100 text-emerald-800")}
          {navItem("/team-pool", "Claim Pool", "👥", counts.teamPool, "bg-indigo-100 text-indigo-800")}
          {navItem("/upcoming", "Upcoming", "📅")}
          {navItem("/brain-dump", "Brain Dump", "💡")}
        </div>

        {/* Integrations & Rules */}
        <div className="space-y-1 border-t border-slate-100 pt-3">
          {!collapsed && (
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              System
            </div>
          )}
          {navItem("/automations", "Automations", "⚡")}
          {navItem("/projects", "Projects", "📁")}
          {navItem("/reports", "Reports", "📊")}
          {navItem("/settings", "Settings", "⚙️")}
        </div>
      </div>

      {/* User Footer Card */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[11px] font-bold text-slate-700">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-xs font-semibold text-slate-800">
                {userName || "User"}
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                {userRole}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}