"use client";

import { useState, useEffect } from "react";
import { useRouter } from `"next/navigation"`;
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  category: string;
  priority: string;
  title: string;
  content: string;
  read: boolean;
  pinned: boolean;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

const CATEGORIES = [
  { key: "ALL", label: "All Activity", icon: "⚡" },
  { key: "TASKS", label: "Tasks", icon: "✓" },
  { key: "DIRECT_MESSAGES", label: "Direct Messages", icon: "💬" },
  { key: "GROUP_CHATS", label: "Group Chats", icon: "👥" },
  { key: "GMAIL", label: "Gmail", icon: "✉️" },
  { key: "MENTIONS", label: "Mentions", icon: "@" },
  { key: "APPROVALS", label: "Approvals", icon: "🛡️" },
  { key: "SYSTEM", label: "System", icon: "⚙️" },
];

export function UnifiedInboxClient({
  currentUserId,
  organizationId,
  initialConversations,
}: {
  currentUserId: string;
  organizationId: string;
  initialConversations: any[];
}) {
  const router = useRouter();

  // State
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick Task Conversion State
  const [converting, setConverting] = useState(false);

  // Fetch Notifications
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        search: searchQuery,
      });
      const res = await fetch(`/api/inbox?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setCategoryCounts(data.categoryCounts || {});
        if (data.notifications?.length > 0 && !selectedNotification) {
          setSelectedNotification(data.notifications[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [activeCategory, searchQuery]);

  // Bulk Read Action
  const handleMarkAllRead = async () => {
    await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "MARK_ALL_READ" }),
    });
    loadNotifications();
    router.refresh();
  };

  // Convert current selected notification to Task
  const handleCreateTaskFromNotification = async () => {
    if (!selectedNotification) return;
    setConverting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Task: ${selectedNotification.title}`,
          description: `Generated from Inbox notification (${selectedNotification.category}):\n\n${selectedNotification.content}`,
          priority: selectedNotification.priority || "MEDIUM",
        }),
      });
      if (res.ok) {
        alert("🎉 Task successfully created and assigned!");
        router.refresh();
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl font-sans select-none overflow-hidden">
      {/* Top Status & Search Bar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-2xl bg-purple-100 px-3 py-1 text-xs font-black text-purple-800">
            {unreadCount} Unread Notifications
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            className="rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            ✓ Mark all read
          </Button>
        </div>

        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search notifications, messages, emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs outline-none focus:border-purple-600 transition shadow-xs"
          />
        </div>
      </div>

      {/* 3-Pane Command Layout (Viewport Constrained + Independent Inner Scrollbars) */}
      <div
        style={{ height: "calc(100vh - 230px)", maxHeight: "720px", minHeight: "500px" }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-200/50 backdrop-blur-xl"
      >
        {/* Pane 1: Category Navigator (Col 3) */}
        <div className="lg:col-span-3 border-r border-slate-100 p-3.5 flex flex-col min-h-0">
          <span className="px-2 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
            Channels & Feeds
          </span>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-kanban-scroll">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts[cat.key] || 0;
              const active = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  {count > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        active ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pane 2: Notification Stream (Col 4) */}
        <div className="lg:col-span-4 border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/30">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 shrink-0 bg-white">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Activity Stream
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {notifications.length} items
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 pr-1 custom-kanban-scroll">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Syncing feeds...</div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No notifications in this feed.
              </div>
            ) : (
              notifications.map((item) => {
                const isSelected = selectedNotification?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedNotification(item)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-purple-50/80 border-l-4 border-purple-600"
                        : item.read
                        ? "hover:bg-slate-100/60 opacity-75"
                        : "bg-white hover:bg-slate-50 font-bold"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-700">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h4 className="mt-1 text-xs font-black text-slate-900 line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pane 3: Detail & Action Workspace (Col 5) */}
        <div className="lg:col-span-5 p-5 flex flex-col justify-between min-h-0 bg-slate-50/40">
          {selectedNotification ? (
            <div className="flex flex-col h-full justify-between min-h-0 space-y-4">
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5 custom-kanban-scroll">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-700">
                    {selectedNotification.priority} Priority
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-black text-slate-900 leading-snug">
                    {selectedNotification.title}
                  </h2>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700 leading-relaxed shadow-xs">
                    {selectedNotification.content}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200/80 shrink-0">
                <Button
                  size="sm"
                  disabled={converting}
                  onClick={handleCreateTaskFromNotification}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3 py-1.5 cursor-pointer shadow-sm"
                >
                  {converting ? "Creating Task..." : "✓ Convert to Task"}
                </Button>

                {selectedNotification.actionUrl && (
                  <a
                    href={selectedNotification.actionUrl}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Source Item →
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Select an item from the stream to inspect details and take action.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}