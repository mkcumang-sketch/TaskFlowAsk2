"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  memberCode?: string | null;
  role?: string | { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  presenceStatus?: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE" | null;
  lastSeenAt?: string | Date | null;
  updatedAt?: string | Date;
}

interface ChannelItem {
  id: string;
  name: string | null;
  description?: string | null;
  type: "DIRECT" | "DEPARTMENT" | "COMPANY_ALL_HANDS" | "PROJECT";
  department?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  participants: Array<{
    user: { id: string; name: string | null; email: string; avatarUrl?: string | null };
    role: string;
  }>;
}

interface MessageItem {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaName?: string | null;
  createdAt: string | Date;
  sender: { id: string; name: string | null; email: string };
}

interface NotificationItem {
  id: string;
  title: string | null;
  content: string;
  category: string;
  read: boolean;
  link?: string | null;
  createdAt: string | Date;
}

interface InboxViewProps {
  initialNotifications?: NotificationItem[];
  initialChannels?: ChannelItem[];
  directoryUsers?: UserItem[];
  currentUserId: string;
  currentUserRole?: string | null;
}

export function InboxView({
  initialNotifications = [],
  initialChannels = [],
  directoryUsers = [],
  currentUserId,
  currentUserRole = "EMPLOYEE",
}: InboxViewProps) {
  const router = useRouter();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Navigation Feeds
  const [activeFeed, setActiveFeed] = useState<
    "GROUP_CHATS" | "DIRECT_MESSAGES" | "TASKS" | "APPROVALS" | "ALL"
  >("DIRECT_MESSAGES");
  const [searchQuery, setSearchQuery] = useState("");

  // Targets & Selection
  const [channels, setChannels] = useState<ChannelItem[]>(initialChannels);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannels[0]?.id || null
  );
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  // Live Messages Stream
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);

  // Create Room Modal
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDept, setNewGroupDept] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const roleClean = (currentUserRole || "EMPLOYEE").toUpperCase();
  const isManager = ["SUPER_ADMIN", "ADMIN", "OWNER", "MANAGER"].includes(roleClean);

  const isUserOnline = (user: UserItem) => {
    if (user.id === currentUserId) return true;
    if (user.presenceStatus === "ONLINE") return true;
    const timestamp = user.lastSeenAt || user.updatedAt;
    if (!timestamp) return false;
    const diffMins = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60);
    return diffMins < 10;
  };

  const getRoleLabel = (role: UserItem["role"]) => {
    if (!role) return "Member";
    if (typeof role === "string") return role;
    return role.name || "Member";
  };

  // Heartbeat Presence Ping
  useEffect(() => {
    const reportPresence = async () => {
      try {
        await fetch("/api/users/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ONLINE" }),
        });
      } catch {}
    };

    reportPresence();
    const interval = setInterval(reportPresence, 30000);
    return () => clearInterval(interval);
  }, []);

  // Message Polling
  const fetchMessages = async () => {
    try {
      let url = "";
      if (selectedRecipientId) {
        url = `/api/inbox/messages?recipientId=${selectedRecipientId}`;
      } else if (selectedChannelId) {
        url = `/api/inbox/messages?channelId=${selectedChannelId}`;
      } else {
        return;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.channelId) {
          setSelectedChannelId(data.channelId);
        }
      }
    } catch (err) {
      console.error("Message polling error:", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    const pollTimer = setInterval(fetchMessages, 2500);
    return () => clearInterval(pollTimer);
  }, [selectedChannelId, selectedRecipientId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send Message with Attachments
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    let uploadedUrl: string | null = null;
    let uploadedName: string | null = null;

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedUrl = uploadData.url;
          uploadedName = uploadData.fileName;
        }
      }

      let targetChannelId = selectedChannelId;
      if (!targetChannelId && selectedRecipientId) {
        const initRes = await fetch(`/api/inbox/messages?recipientId=${selectedRecipientId}`);
        if (initRes.ok) {
          const initData = await initRes.json();
          targetChannelId = initData.channelId;
          setSelectedChannelId(initData.channelId);
        }
      }

      if (!targetChannelId) throw new Error("No target channel found");

      const res = await fetch("/api/inbox/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: targetChannelId,
          content: inputMessage.trim(),
          mediaUrl: uploadedUrl,
          mediaName: uploadedName,
        }),
      });

      if (res.ok) {
        const newMessage = await res.json();
        setMessages((prev) => [...prev, newMessage]);
        setInputMessage("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to deliver message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Create Department Room
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch("/api/inbox/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          department: newGroupDept.trim(),
          type: "DEPARTMENT",
          memberIds: selectedMembers,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setChannels((prev) => [created, ...prev]);
        setSelectedChannelId(created.id);
        setSelectedRecipientId(null);
        setShowGroupModal(false);
        setNewGroupName("");
        setNewGroupDept("");
        setSelectedMembers([]);
        router.refresh();
      }
    } catch (err) {
      console.error("Group creation error:", err);
    }
  };

  const selectedColleague = useMemo(
    () => directoryUsers.find((u) => u.id === selectedRecipientId),
    [directoryUsers, selectedRecipientId]
  );

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId),
    [channels, selectedChannelId]
  );

  const selectedNotification = useMemo(
    () => notifications.find((n) => n.id === selectedNotificationId),
    [notifications, selectedNotificationId]
  );

  const filteredColleagues = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return directoryUsers
      .filter((u) => u.id !== currentUserId)
      .filter((u) => {
        if (!q) return true;
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.memberCode?.toLowerCase().includes(q) ||
          u.department?.name.toLowerCase().includes(q)
        );
      });
  }, [directoryUsers, currentUserId, searchQuery]);

  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return channels.filter((c) => {
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.department?.name.toLowerCase().includes(q)
      );
    });
  }, [channels, searchQuery]);

  return (
    <div className="w-full space-y-4 font-sans select-none relative overflow-hidden">
      {/* 🔮 Background Aurora Light Effects */}
      <div className="pointer-events-none absolute -top-14 left-1/4 h-96 w-96 rounded-full bg-purple-500/15 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 -right-16 h-[420px] w-[420px] rounded-full bg-indigo-500/15 blur-[150px]" />

      {/* 🧭 Top Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/80 bg-white/95 p-3.5 md:p-4 shadow-xl shadow-slate-200/50 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 border border-purple-200/80 px-3.5 py-1.5 text-xs font-black text-purple-900 font-mono shadow-xs">
            {directoryUsers.length} Colleagues Connected
          </span>
          {isManager && (
            <Button
              size="sm"
              onClick={() => setShowGroupModal(true)}
              className="h-9 rounded-xl bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 px-4 text-xs font-black text-white shadow-md shadow-purple-950/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-purple-500/30"
            >
              + Create Department Room
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Filter team, rooms, or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 sm:w-80 h-10 rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition-all shadow-xs"
          />
          <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>
      </div>

      {/* ▦ 3-Panel Unified Command Canvas (Locked to Viewport + Independent Scrolling) */}
      <div
        style={{ height: "calc(100vh - 215px)", maxHeight: "720px", minHeight: "500px" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-hidden rounded-[32px] border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl"
      >
        {/* PANEL 1: Navigation Feeds (3 Cols) */}
        <div className="md:col-span-3 border-r border-slate-100 p-3.5 flex flex-col min-h-0 overflow-hidden">
          <div className="px-2 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
            CHANNELS & FEEDS
          </div>

          <nav className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1 custom-kanban-scroll">
            {[
              { id: "GROUP_CHATS", label: "Group & Dept Rooms", icon: "👥" },
              { id: "DIRECT_MESSAGES", label: "Direct Messages (1:1)", icon: "💬" },
              { id: "TASKS", label: "Task Alerts", icon: "✓" },
              { id: "APPROVALS", label: "Approvals", icon: "🛡️" },
              { id: "ALL", label: "All Activity", icon: "⚡" },
            ].map((feed) => {
              const isActive = activeFeed === feed.id;
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() => setActiveFeed(feed.id as any)}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-black transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-950 text-white shadow-md shadow-slate-950/20 scale-[1.01]"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{feed.icon}</span>
                    <span>{feed.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* PANEL 2: Target Selection Stream (4 Cols) - Locked Box with Dedicated Scrollbar */}
        <div className="md:col-span-4 border-r border-slate-100 p-3.5 flex flex-col min-h-0 overflow-hidden bg-slate-50/20">
          {/* GROUP & DEPARTMENT ROOMS */}
          {activeFeed === "GROUP_CHATS" && (
            <>
              <div className="px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                Rooms & Channels ({filteredChannels.length})
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-1.5 custom-kanban-scroll">
                {filteredChannels.length === 0 ? (
                  <div className="py-20 text-center text-xs font-semibold text-slate-400">
                    No active rooms found.
                  </div>
                ) : (
                  filteredChannels.map((c) => {
                    const isSelected = selectedChannelId === c.id && !selectedRecipientId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedChannelId(c.id);
                          setSelectedRecipientId(null);
                        }}
                        className={`rounded-2xl border p-3 transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/80 shadow-sm ring-1 ring-purple-300"
                            : "border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50/80 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900 tracking-tight">
                            {c.name}
                          </h4>
                          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[9px] font-black uppercase text-purple-800 font-mono">
                            {c.type === "COMPANY_ALL_HANDS" ? "COMPANY" : c.type}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-slate-500 line-clamp-1">
                          {c.description || (c.department ? `Dept: ${c.department.name}` : "Workspace room")}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* 1-ON-1 DIRECT MESSAGES */}
          {activeFeed === "DIRECT_MESSAGES" && (
            <>
              <div className="px-1 pb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                <span>DIRECT MESSAGES ({filteredColleagues.length})</span>
                <span className="text-purple-600 font-mono lowercase">
                  {filteredColleagues.filter((u) => isUserOnline(u)).length} online
                </span>
              </div>
              <div className="mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-1.5 custom-kanban-scroll">
                {filteredColleagues.length === 0 ? (
                  <div className="py-20 text-center text-xs font-semibold text-slate-400">
                    No teammates found.
                  </div>
                ) : (
                  filteredColleagues.map((u) => {
                    const online = isUserOnline(u);
                    const isSelected = selectedRecipientId === u.id;

                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          setSelectedRecipientId(u.id);
                          setSelectedChannelId(null);
                        }}
                        className={`flex items-center justify-between rounded-2xl border p-3 transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-500 bg-purple-50/80 shadow-sm ring-1 ring-purple-300"
                            : "border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50/80 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-black text-white shadow-xs">
                              {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white shadow-xs ${
                                online ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                              }`}
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {u.name || u.email.split("@")[0]}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {online ? "🟢 Active" : "⚪ Offline"} • {getRoleLabel(u.role)}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-black text-purple-600 hover:text-purple-800 transition">
                          Chat →
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* NOTIFICATION STREAMS */}
          {["TASKS", "APPROVALS", "ALL"].includes(activeFeed) && (
            <>
              <div className="px-1 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
                Activity Stream
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 pr-1.5 custom-kanban-scroll">
                {notifications
                  .filter((n) => activeFeed === "ALL" || n.category === activeFeed)
                  .map((n) => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNotificationId(n.id)}
                      className={`rounded-2xl border p-3 transition-all cursor-pointer ${
                        selectedNotificationId === n.id
                          ? "border-purple-500 bg-purple-50/80 shadow-sm"
                          : "border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50 shadow-xs"
                      }`}
                    >
                      <h4 className="text-xs font-black text-slate-900 line-clamp-1">{n.title || "Notification"}</h4>
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">{n.content}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* PANEL 3: Real-Time Chat & Workspace Display (5 Cols) */}
        <div className="md:col-span-5 p-4 flex flex-col justify-between h-full min-h-0 overflow-hidden bg-white">
          {["TASKS", "APPROVALS", "ALL"].includes(activeFeed) && selectedNotification ? (
            <div className="space-y-4 pt-1 flex-1 min-h-0 overflow-y-auto custom-kanban-scroll pr-1">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 space-y-2.5 shadow-sm">
                <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-800 uppercase font-mono">
                  {selectedNotification.category}
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedNotification.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.content}
                </p>
              </div>
              {selectedNotification.link && (
                <Link href={selectedNotification.link}>
                  <Button className="w-full h-10 rounded-xl bg-slate-950 text-xs font-black text-white hover:bg-slate-800 shadow-md">
                    Open Task Workspace →
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Active Conversation Header */}
              <div className="border-b border-slate-100 pb-3 shrink-0">
                {selectedRecipientId && selectedColleague ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-black text-white shadow-sm">
                        {selectedColleague.name ? selectedColleague.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white shadow-xs ${
                          isUserOnline(selectedColleague) ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        {selectedColleague.name || selectedColleague.email}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-400">
                        {isUserOnline(selectedColleague) ? "🟢 Active in workspace" : "⚪ Offline"} •{" "}
                        {getRoleLabel(selectedColleague.role)}
                      </span>
                    </div>
                  </div>
                ) : selectedChannel ? (
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                      {selectedChannel.name}
                    </h3>
                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider font-mono">
                      {selectedChannel.type === "COMPANY_ALL_HANDS" ? "COMPANY" : selectedChannel.type} ROOM
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    Select a room or colleague to initialize communication
                  </span>
                )}
              </div>

              {/* Chat Stream with Internal Scroll */}
              <div ref={chatScrollRef} className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3.5 pr-1 custom-kanban-scroll">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <span className="text-2xl mb-1">🎉</span>
                    <p className="text-xs font-bold max-w-[240px]">
                      No messages in this channel yet. Say hello or share deliverables below!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender.id === currentUserId;
                    const isImage = m.mediaUrl && /\.(jpg|jpeg|png|webp|gif)$/i.test(m.mediaUrl);

                    return (
                      <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">
                          {isMe ? "You" : m.sender.name || m.sender.email}
                        </span>

                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs font-medium shadow-xs ${
                            isMe
                              ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white"
                              : "bg-slate-100 text-slate-900 border border-slate-200/80"
                          }`}
                        >
                          {m.content && <p className="leading-relaxed">{m.content}</p>}

                          {m.mediaUrl && (
                            <div className="mt-2">
                              {isImage ? (
                                <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                  <div className="relative group overflow-hidden rounded-xl border border-white/20 shadow-md">
                                    <img
                                      src={m.mediaUrl}
                                      alt={m.mediaName || "attachment"}
                                      className="max-h-48 max-w-full rounded-xl object-cover"
                                    />
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={m.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 rounded-xl p-2 text-[11px] font-black ${
                                    isMe
                                      ? "bg-purple-800/80 text-white"
                                      : "bg-white text-purple-800 border border-slate-200"
                                  }`}
                                >
                                  <span>📎</span>
                                  <span className="truncate">{m.mediaName || "Download Attachment"}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Console (Fixed Bottom) */}
              {(selectedChannelId || selectedRecipientId) && (
                <div className="pt-3 border-t border-slate-100 shrink-0 space-y-2">
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-purple-100/80 border border-purple-300 px-3 py-1.5 rounded-xl text-[11px] font-bold text-purple-900">
                      <span className="truncate max-w-[240px]">📎 Ready: {selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-purple-950 font-black hover:opacity-75 cursor-pointer ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition cursor-pointer text-base shadow-xs"
                      title="Attach file"
                    >
                      📎
                    </button>

                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 text-xs font-semibold outline-none focus:border-purple-600 focus:bg-white transition"
                    />

                    <Button
                      type="submit"
                      disabled={isSending || (!inputMessage.trim() && !selectedFile)}
                      className="h-10 rounded-xl bg-purple-600 text-white text-xs font-black px-4 hover:bg-purple-700 transition cursor-pointer shadow-md shadow-purple-500/20"
                    >
                      {isSending ? "..." : "Send"}
                    </Button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 🚀 MODAL: Create Department Room */}
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Create Department Room</h3>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design Team Sync"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Frontend, Operations, Architecture"
                  value={newGroupDept}
                  onChange={(e) => setNewGroupDept(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 p-2.5 text-xs font-bold outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Assign Teammates
                </label>
                <div className="mt-1 max-h-36 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50 custom-kanban-scroll">
                  {directoryUsers.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMembers([...selectedMembers, u.id]);
                          else setSelectedMembers(selectedMembers.filter((id) => id !== u.id));
                        }}
                        className="rounded border-slate-300 accent-purple-600 h-3.5 w-3.5"
                      />
                      <span className="truncate">
                        {u.name || u.email} ({getRoleLabel(u.role)})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGroupModal(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs cursor-pointer shadow-md"
                >
                  Create Room
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}