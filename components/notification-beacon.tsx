"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { playAlertChime } from "@/lib/sounds";

interface PopupAlert {
  id: string;
  type: "MESSAGE" | "ASSIGNED" | "OVERDUE" | "REMINDER";
  title: string;
  description: string;
  link?: string;
  timestamp: number;
}

export function NotificationBeacon() {
  const [alerts, setAlerts] = useState<PopupAlert[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const lastReminderTime = useRef<number>(Date.now());

  // 1. Request Browser Notifications for Background & Mobile Notifications
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const triggerSystemNotification = (title: string, body: string, link?: string) => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/favicon.ico",
        });
        if (link) {
          notif.onclick = () => {
            window.focus();
            window.location.href = link;
          };
        }
      } catch {
        // Fallback to in-app popup
      }
    }
  };

  const addAlert = (alert: Omit<PopupAlert, "id" | "timestamp">) => {
    const id = `${alert.type}_${Date.now()}_${Math.random()}`;
    const newAlert: PopupAlert = { ...alert, id, timestamp: Date.now() };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 2)]);
    playAlertChime(alert.type);
    triggerSystemNotification(alert.title, alert.description, alert.link);

    // Auto dismiss after 8 seconds
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }, 8000);
  };

  // 2. Real-time Poll Engine (Checks every 6 seconds)
  useEffect(() => {
    let isMounted = true;

    async function checkNotifications() {
      try {
        const res = await fetch("/api/notifications/poll");
        if (!res.ok || !isMounted) return;
        const data = await res.json();

        // 💬 A. Live Notifications (Chats / System Alerts)
        const notificationsList = data.recentNotifications || data.recentMessages || [];
        if (notificationsList.length > 0) {
          notificationsList.forEach((n: any) => {
            const key = `notif_${n.id}`;
            if (!seenIds.current.has(key)) {
              seenIds.current.add(key);
              addAlert({
                type: "MESSAGE",
                title: n.title || `💬 Message from ${n.sender?.name || "Team Member"}`,
                description: n.content || "Sent an update in your workspace",
                link: n.link || "/inbox",
              });
            }
          });
        }

        // ⚡ B. New Task Assigned Alerts (1-Hour SLA Warning)
        if (data.pendingAssignedTasks?.length > 0) {
          data.pendingAssignedTasks.forEach((t: any) => {
            const key = `assigned_${t.id}`;
            if (!seenIds.current.has(key)) {
              seenIds.current.add(key);
              addAlert({
                type: "ASSIGNED",
                title: `⚡ New Task Assigned [${t.priority || "P3"}]`,
                description: `"${t.title}" — Please accept within the 1-hour SLA window!`,
                link: `/tasks/${t.id}`,
              });
            }
          });
        }

        // 🚨 C. Overdue / SLA Breached Alerts
        if (data.overdueTasks?.length > 0) {
          data.overdueTasks.forEach((t: any) => {
            const key = `overdue_${t.id}`;
            if (!seenIds.current.has(key)) {
              seenIds.current.add(key);
              addAlert({
                type: "OVERDUE",
                title: `🚨 CRITICAL SLA BREACH!`,
                description: `Task "${t.title}" (${t.priority}) has exceeded its SLA time limit!`,
                link: `/tasks/${t.id}`,
              });
            }
          });
        }

        // ⏱️ D. 10-MINUTE RECURRING REMINDER ENGINE
        const now = Date.now();
        if (now - lastReminderTime.current >= 10 * 60 * 1000) {
          lastReminderTime.current = now;

          const pendingCount = data.pendingAssignedTasks?.length || 0;
          const activeCount = data.inProgressTasks?.length || 0;

          if (pendingCount > 0 || activeCount > 0) {
            addAlert({
              type: "REMINDER",
              title: `⏱️ 10-Minute Focus Reminder`,
              description: `You have ${pendingCount} task(s) awaiting acceptance and ${activeCount} running in flight.`,
              link: "/today",
            });
          }
        }
      } catch {
        // Silently retry on next poll interval
      }
    }

    checkNotifications();
    const interval = setInterval(checkNotifications, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:top-5 sm:right-6 z-[9999] flex flex-col gap-2 max-w-[94vw] sm:max-w-sm w-full pointer-events-none select-none">
      {alerts.map((alert) => {
        const isOverdue = alert.type === "OVERDUE";
        const isAssigned = alert.type === "ASSIGNED";
        const isMsg = alert.type === "MESSAGE";

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl transition-all duration-300 animate-in slide-in-from-top-4 ${
              isOverdue
                ? "bg-rose-950/95 border-rose-500/80 text-white ring-2 ring-rose-500/50"
                : isAssigned
                ? "bg-slate-950/95 border-purple-500/70 text-white ring-1 ring-purple-500/40"
                : isMsg
                ? "bg-slate-900/95 border-emerald-500/60 text-white ring-1 ring-emerald-500/30"
                : "bg-indigo-950/95 border-indigo-400/60 text-white"
            }`}
          >
            {/* Ambient Background Glow Orb */}
            <div
              className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-xl pointer-events-none ${
                isOverdue
                  ? "bg-rose-500/40"
                  : isAssigned
                  ? "bg-purple-500/30"
                  : "bg-emerald-500/30"
              }`}
            />

            <div className="relative z-10 flex items-start justify-between gap-2.5">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full animate-ping bg-current shrink-0" />
                  <h4 className="text-xs font-black tracking-tight leading-tight truncate">
                    {alert.title}
                  </h4>
                </div>
                <p className="text-[11px] font-medium opacity-90 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>

                {alert.link && (
                  <Link
                    href={alert.link}
                    onClick={() =>
                      setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
                    }
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-purple-300 hover:text-white pt-1 tracking-wider"
                  >
                    <span>Open Details</span>
                    <span>→</span>
                  </Link>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setAlerts((prev) => prev.filter((a) => a.id !== alert.id))
                }
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer shrink-0"
                aria-label="Dismiss alert"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}