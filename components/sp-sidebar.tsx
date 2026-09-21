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

export interface UserProfileData {
  name: string;
  role: string;
  department: string;
  totalTasks: number;
}

export interface SPSidebarProps {
  initialCounts?: Partial<SPCounterData>;
  userRole?: string;
  userName?: string;
  departmentName?: string;
  totalTasksCount?: number;
  isMobile?: boolean;
  onClose?: () => void;
}

export function SPSidebar({
  initialCounts,
  userRole = "ADMIN",
  userName = "Active User",
  departmentName = "Operations",
  totalTasksCount = 0,
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState<UserProfileData>({
    name: userName,
    role: userRole,
    department: departmentName,
    totalTasks: totalTasksCount,
  });

  const isManager =
    userRole === "SUPER_ADMIN" ||
    userRole === "ADMIN" ||
    userRole === "OWNER" ||
    userRole === "MANAGER";

  // Fetch Live Counters and User Profile Stats
  useEffect(() => {
    let isMounted = true;

    async function fetchSidebarData() {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      try {
        const [counterRes, profileRes] = await Promise.all([
          fetch("/api/sp/counters").catch(() => null),
          fetch("/api/users/me").catch(() => null),
        ]);

        if (counterRes?.ok && isMounted) {
          const data = await counterRes.json();
          setCounts(data);
        }

        if (profileRes?.ok && isMounted) {
          const userData = await profileRes.json();
          setProfile({
            name: userData.name || userName,
            role: userData.role?.name || userData.role || userRole,
            department: userData.department?.name || userData.department || departmentName,
            totalTasks: userData._count?.tasks ?? userData.totalTasks ?? totalTasksCount,
          });
        }
      } catch (err) {
        console.error("Sidebar sync error:", err);
      }
    }

    fetchSidebarData();
    const interval = setInterval(fetchSidebarData, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchSidebarData();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userName, userRole, departmentName, totalTasksCount]);

  // Sign out / Log out handler
  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  // Global Keyboard Shortcuts
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
      {/* Scrollable Upper Navigation */}
      <div className="space-y-6 overflow-y-auto pr-1 custom-kanban-scroll">
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
                    SUPER PRODUCTIVITY
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 cursor-pointer"
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
          {navItem("/team", "Team & Members", "👥")}
          {navItem("/today", "Today", "☀️", counts.today, "bg-amber-100 text-amber-900 font-bold")}
          {navItem("/inbox", "Inbox", "📥", counts.inbox, "bg-blue-100 text-blue-900 font-bold")}
          {navItem("/planner", "Planner", "📋")}
          {navItem("/schedule", "Schedule", "⏰")}
          {navItem("/tasks", "Task List", "✓", counts.urgent, "bg-rose-100 text-rose-900 font-bold")}
          {navItem("/tasks/kanban", "Task Board", "🗂️")}
        </div>

        {/* 2. Organization */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
          {(!collapsed || isMobile) && (
            <div className="px-3 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              Organization
            </div>
          )}
          {isManager && navItem("/dashboard", "Dashboard", "📊")}
          {navItem("/projects", "Projects", "📁")}
          {navItem("/reports", "Reports", "📈")}
          {navItem("/calendar", "Calendar", "📆")}
          {navItem("/notifications", "Notifications", "🔔")}
        </div>

        {/* 3. System */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3.5">
          {(!collapsed || isMobile) && (
            <div className="px-3 pb-1 text-xs font-black uppercase tracking-widest text-slate-500">
              System
            </div>
          )}
          {navItem("/automations", "Automations", "⚡")}
        </div>
      </div>

      {/* 🔴 User Profile Component (Under Red Line) */}
      <div className="border-t border-slate-200/90 pt-3.5 mt-3 shrink-0">
        <div className="rounded-[24px] bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 p-3.5 shadow-sm space-y-3">
          {/* Row 1: Avatar, Name, Department & Role */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-black text-white shadow-md shadow-purple-600/30">
                {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-xs" />
            </div>

            {(!collapsed || isMobile) && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="truncate text-sm font-black text-slate-900 leading-tight">
                  {profile.name}
                </span>

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-700 font-mono">
                    {profile.role}
                  </span>
                  <span className="truncate text-[11px] font-bold text-slate-500">
                    • {profile.department}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Total Tasks & Sign Out Button */}
          {(!collapsed || isMobile) && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-extrabold text-slate-500">Tasks:</span>
                <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-black text-slate-800 font-mono">
                  {profile.totalTasks}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition active:scale-95 cursor-pointer shadow-xs"
                title="Sign out of account"
              >
                <span>🚪</span>
                <span>{isLoggingOut ? "Leaving..." : "Log Out"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}