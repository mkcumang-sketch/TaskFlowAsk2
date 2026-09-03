"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";

interface AppShellProps {
  title: string;
  subtitle?: string;
  userRole?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, userRole = "MEMBER", children }: AppShellProps) {
  const pathname = usePathname();

  const isBoss =
    userRole === "SUPER_ADMIN" ||
    userRole === "ADMIN" ||
    userRole === "OWNER" ||
    userRole === "MANAGER";

  const navItems = isBoss
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Tasks", href: "/tasks" },
        { label: "Kanban", href: "/tasks/kanban" },
        { label: "Team", href: "/team" },
        { label: "Reports", href: "/reports" },
      ]
    : [
        { label: "My Day", href: "/my-day" },
        { label: "My Tasks", href: "/tasks" },
      ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href={isBoss ? "/dashboard" : "/my-day"} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                T
              </span>
              <span className="text-base font-bold text-slate-900 tracking-tight">TaskFlow</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}