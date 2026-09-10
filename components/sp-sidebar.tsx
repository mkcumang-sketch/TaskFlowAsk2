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

export interface SPSidebarProps {
  initialCounts?: Partial<SPCounterData>;
  userRole?: string;
  userName?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export function SPSidebar({
  initialCounts,
  userRole = "EMPLOYEE",
  userName,
  isMobile = false,
  onClose,
}: SPSidebarProps) {
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
  const isManager =
    userRole === "SUPER_ADMIN" ||
    userRole === "ADMIN" ||
    userRole === "OWNER" ||
    userRole === "MANAGER";

  // Visibility-aware polling
  useEffect(() => {
    let isMounted = true;

    async function fetchCounters() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/sp/counters");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setCounts(data);
        }
      } catch (err) {
        console.error("Counter sync error:", err);
      }
    }

    fetchCounters();
    const interval = setInterval(fetchCounters, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCounters();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    if (isMobile) return;
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
  }, [router, isMobile]);

  const navItem = (
    href: string,
    label: string,
    icon: string,
    badgeValue?: number,
    badgeColor: string = "bg-slate-100 text-slate-800"
  ) => {
    const isActive = pathname === href || pathname.startsWith(href + "/");

    return (
      <Link
        href={href}
        onClick={() => {
          if (isMobile && onClose) onClose();
        }}
        className={`group flex items-center justify-between rounded-2xl px-4 py-2.5 text-[15px] font-extrabold tracking-tight transition-all duration-150 ${
          isMobile ? "min-h-[50px]" : "min-h-[44px]"
        } ${
          isActive
            ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20 ring-1 ring-slate-800"
            : "text-slate-700 hover:bg-slate-100/90 hover:text-slate-950"
        }`}
        title={!isMobile && collapsed ? label : undefined}
      >
        <div className="flex items-center gap-3.5 overflow-hidden">
          <span className="text-[18px] shrink-0 leading-none transition-transform group-hover:scale-115">
            {icon}
          </span>
          {(!collapsed || isMobile) && <span className="truncate">{label}</span>}
        </div>

        {(!collapsed || isMobile) && typeof badgeValue === "number" && badgeValue > 0 && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black font-mono tracking-tight shadow-xs transition ${
              isActive ? "bg-purple-600 text-white ring-1 ring-purple-400/40" : badgeColor
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
      className={`relative flex flex-col justify-between border-r border-slate-200/80 bg-white/95 p-4.5 transition-all duration-200 select-none backdrop-blur-md ${
        isMobile ? "w-full border-r-0" : collapsed ? "w-20" : "w-80"
      }`}
    >
      <div className="space-y-6 overflow-y-auto pr-1">
        {/* Header / Brand */}
        {!isMobile && (
          <div className="flex items-center justify-between px-2 py-1.5 mb-2">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-md shadow-slate-950/25 ring-1 ring-slate-800">
                  TF
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-black tracking-tight text-slate-950 leading-tight">
                    TaskFlow
                  </span>
                  <span className="text-[10px] font-black tracking-widest uppercase text-purple-600">
                    Super Productivity
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
              title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {collapsed ? "→" : "←"}
            </button>
          </div>
        )}

        {/* 1. Core Workspace */}
        <div className="space-y-1.5">
          {(!collapsed || isMobile) && (
            <div className="px-3 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Workspace
            </div>
          )}
          {navItem("/today", "Today", "☀️", counts.today, "bg-amber-100 text-amber-900 font-bold")}
          {navItem("/inbox", "Inbox", "📥", counts.inbox, "bg-blue-100 text-blue-900 font-bold")}
          {navItem("/planner", "Planner", "📋")}
          {navItem("/schedule", "Schedule", "⏰")}
          {navItem("/tasks", "Task List", "✓", counts.urgent, "bg-rose-100 text-rose-900 font-bold")}
          {navItem("/tasks/kanban", "Task Board", "🗂️")}
        </div>

        
        {/* 3. Execution & Routines */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
          {(!collapsed || isMobile) && (
            <div className="px-3 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Execution
            </div>
          )}
          
          {navItem("/brain-dump", "Brain Dump", "💡")}
        </div>

        {/* 4. Organization & Portfolio */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
          {(!collapsed || isMobile) && (
            <div className="px-3 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Organization
            </div>
          )}
          {isManager && navItem("/dashboard", "Dashboard", "📊")}
          {navItem("/team", "Team & Members", "👥")}
          {navItem("/projects", "Projects", "📁")}
          {navItem("/reports", "Reports", "📈")}
          {navItem("/calendar", "Calendar", "📆")}
          {navItem("/notifications", "Notifications", "🔔")}
        </div>

        {/* 5. System & Administration */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
          {(!collapsed || isMobile) && (
            <div className="px-3 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              System
            </div>
          )}
          {navItem("/automations", "Automations", "⚡")}
         
         
        </div>
      </div>

      {/* User Footer Card */}
      <div className="border-t border-slate-100 pt-3.5 mt-4">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-sm font-black text-white shadow-md shadow-purple-600/25">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="truncate text-sm font-black text-slate-950 tracking-tight">
                {userName || "Active User"}
              </span>
              <span className="text-[11px] font-extrabold text-purple-700 uppercase tracking-wider">
                {userRole}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}