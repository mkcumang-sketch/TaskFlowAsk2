"use client";

import { useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { QuickCapture } from "@/components/quick-capture";
import { SPSidebar } from "@/components/sp-sidebar";

interface AppShellProps {
  title: string;
  subtitle?: string;
  userRole?: string | null;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, userRole = "EMPLOYEE", children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50/50">
      {/* 🚀 Top Global Utility & Quick Capture Bar */}
      <header className="z-30 shrink-0 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur-md sm:px-6">
        <div className="flex w-full items-center justify-between gap-3">
          {/* Mobile Hamburger (< lg) */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 transition active:scale-95"
              aria-label="Open navigation menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-black tracking-tight text-slate-900">TaskFlow</span>
          </div>

          {/* Quick Capture (Takes Expanded Width) */}
          <div className="min-w-0 flex-1 max-w-3xl">
            <QuickCapture />
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <NotificationBell />
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex min-h-[38px] items-center rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* 🖥️ Full Screen App Body (Fixed Sidebar + Scrollable Workspace) */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* Fixed Desktop Sidebar */}
        <div className="hidden lg:flex shrink-0 h-full">
          <SPSidebar userRole={userRole ?? "EMPLOYEE"} />
        </div>

        {/* Mobile Slide-Over Drawer */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <span className="font-extrabold text-sm text-slate-900">TaskFlow</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" onClick={() => setMobileNavOpen(false)}>
                <SPSidebar userRole={userRole ?? "EMPLOYEE"} isMobile onClose={() => setMobileNavOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* 🌟 Dynamic Expanded Workspace Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-10 pb-20">
          <div className="w-full">
            {/* Page Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{title}</h1>
              {subtitle && <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">{subtitle}</p>}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}