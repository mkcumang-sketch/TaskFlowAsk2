"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { QuickCapture } from "@/components/quick-capture";

interface AppShellProps {
  title: string;
  subtitle?: string;
  userRole?: string;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, userRole = "EMPLOYEE", children }: AppShellProps) {
  const pathname = usePathname();

  // Normalize role to handle lowercase, uppercase, and MEMBER/EMPLOYEE equivalence
  const normalizedRole = (userRole || "EMPLOYEE").toUpperCase();
  const isManagerOrAdmin =
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "OWNER" ||
    normalizedRole === "MANAGER";

  // Roadmap Navigation Items for Manager / Admin
  const managerNavItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tasks", href: "/tasks" },
    { label: "Kanban", href: "/tasks/kanban" },
    { label: "Team", href: "/team" },
    { label: "Reports", href: "/reports" },
    { label: "Calendar", href: "/calendar" },
    { label: "Projects", href: "/projects" },
    { label: "Notifications", href: "/notifications" },
    { label: "Settings", href: "/settings" },
    { label: "Admin", href: "/admin" },
  ];

  // Roadmap Navigation Items for Employee / Member
  const employeeNavItems = [
    { label: "My Day", href: "/my-day" },
    { label: "My Tasks", href: "/tasks" },
    { label: "Calendar", href: "/calendar" },
    { label: "Notifications", href: "/notifications" },
    { label: "Settings", href: "/settings" },
  ];

  const navItems = isManagerOrAdmin ? managerNavItems : employeeNavItems;

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
            <Link
              href={isManagerOrAdmin ? "/dashboard" : "/my-day"}
              className="flex items-center gap-2"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
                T
              </span>
              <span className="text-base font-bold text-slate-900 tracking-tight">TaskFlow</span>
            </Link>

            <nav className="hidden overflow-x-auto sm:flex items-center gap-1">
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

      {/* Quick Capture Toolbar */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-7xl">
          <QuickCapture />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 p-2 backdrop-blur sm:hidden">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-2 py-2 text-center text-[11px] font-semibold ${
              pathname === item.href ? "bg-slate-900 text-white" : "text-slate-600"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main Body */}
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 sm:pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}