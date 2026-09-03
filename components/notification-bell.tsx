"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <span className="font-semibold text-sm text-slate-800">Notifications</span>
            <span className="text-xs text-slate-400">{unreadCount} unread</span>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No alerts right now.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "#"}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg p-2 text-xs transition ${
                    n.readAt ? "bg-white text-slate-600" : "bg-blue-50/70 text-slate-900 font-medium"
                  }`}
                >
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}