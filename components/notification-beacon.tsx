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
        Notification.requestPermission();
      }
    }
  }, []);

  const triggerSystemNotification = (title: string, body: string, link?: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
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

    setAlerts((prev) => [newAlert, ...prev.slice(0, 3)]);
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

        // 💬 A. Chat Message Alerts
        if (data.recentMessages?.length > 0) {
          data.recentMessages.forEach((m: any) => {
            const key = `msg_${m.id}`;
            if (!seenIds.current.has(key)) {
              seenIds.current.add(key);
              addAlert({
                type: "MESSAGE",
                title: `💬 New Message from ${m.sender?.name || "Team Member"}`,
                description: m.content || "Sent an attachment",
                link: "/inbox",
              });
            }
          });
        }

        // ⚡ B. New Task Assigned Alerts
        if (data.pendingAssignedTasks?.length > 0) {
          data.pendingAssignedTasks.forEach((t: any) => {
            const key = `assigned_${t.id}`;
            if (!seenIds.current.has(key)) {
              seenIds.current.add(key);
              addAlert({
                type: "ASSIGNED",
                title: `⚡ New Task Assigned [${t.priority}]`,
                description: `"${t.title}" — Please accept within 1 hour SLA window!`,
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
              title: `⏱️ 10-Minute Productivity Reminder`,
              description: `You have ${pendingCount} pending acceptance and ${activeCount} active tasks running. Keep moving!`,
              link: "/today",
            });
          }
        }
      } catch {
        // Silently retry on next poll
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
    <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-[92vw] sm:max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => {
        const isOverdue = alert.type === "OVERDUE";
        const isAssigned = alert.type === "ASSIGNED";
        const isMsg = alert.type === "MESSAGE";

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-top-3 ${
              isOverdue
                ? "bg-rose-950/90 border-rose-500/80 text-white ring-2 ring-rose-500/50"
                : isAssigned
                ? "bg-slate-950/90 border-purple-500/70 text-white"
                : isMsg
                ? "bg-slate-900/95 border-emerald-500/60 text-white"
                : "bg-indigo-950/90 border-indigo-400/60 text-white"
            }`}
          >
            {/* Glow aura */}
            <div
              className={`absolute -right-6 -top-6 h-20 w-20 rounded-full blur-xl pointer-events-none ${
                isOverdue ? "bg-rose-500/40" : isAssigned ? "bg-purple-500/30" : "bg-emerald-500/30"
              }`}
            />

            <div className="relative z-10 flex items-start justify-between gap-2.5">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full animate-ping bg-current" />
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
                    onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-purple-300 hover:text-white pt-1 tracking-wider"
                  >
                    <span>View Details</span>
                    <span>→</span>
                  </Link>
                )}
              </div>

              <button
                type="button"
                onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                className="text-slate-400 hover:text-white text-xs font-bold p-1 cursor-pointer shrink-0"
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