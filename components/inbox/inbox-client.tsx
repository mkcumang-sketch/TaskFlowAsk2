"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface InboxUser {
  id: string;
  name: string | null;
  email: string;
  role?: string | { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
  presenceStatus?: "ONLINE" | "AWAY" | "BUSY" | "OFFLINE" | null;
  lastSeenAt?: string | Date | null;
  updatedAt?: string | Date;
}

export interface InboxChannel {
  id: string;
  name: string | null;
  description?: string | null;
  type: "DIRECT" | "DEPARTMENT" | "COMPANY_ALL_HANDS" | "PROJECT";
  department?: { id: string; name: string } | null;
}

export interface InboxMessage {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaName?: string | null;
  createdAt: string | Date;
  sender: { id: string; name: string | null; email: string };
}

export interface InboxNotification {
  id: string;
  title: string | null;
  content: string;
  category: string;
  read: boolean;
  link?: string | null;
  createdAt: string | Date;
}

export interface InboxClientProps {
  initialNotifications?: InboxNotification[];
  initialChannels?: InboxChannel[];
  directoryUsers?: InboxUser[];
  currentUserId: string;
  currentUserRole?: string | null;
}

export function InboxClient({
  initialNotifications = [],
  initialChannels = [],
  directoryUsers = [],
  currentUserId,
  currentUserRole = "EMPLOYEE",
}: InboxClientProps) {
  const router = useRouter();
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active navigation feed
  const [activeFeed, setActiveFeed] = useState<
    "ROOMS" | "DIRECT" | "ALERTS" | "APPROVALS" | "ALL"
  >("DIRECT");
  const [searchQuery, setSearchQuery] = useState("");

  // Selections
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    initialChannels[0]?.id || null
  );
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    directoryUsers[0]?.id || null
  );
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(
    initialNotifications[0]?.id || null
  );

  // Messages Stream
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Presence helper
  const isOnline = (user: InboxUser) => {
    if (user.id === currentUserId) return true;
    if (user.presenceStatus === "ONLINE") return true;
    const ts = user.lastSeenAt || user.updatedAt;
    if (!ts) return false;
    return (Date.now() - new Date(ts).getTime()) / (1000 * 60) < 10;
  };

  const getRoleLabel = (role: InboxUser["role"]) => {
    if (!role) return "EMPLOYEE";
    if (typeof role === "string") return role.toUpperCase();
    return (role.name || "EMPLOYEE").toUpperCase();
  };

  // Polling messages
  useEffect(() => {
    let isMounted = true;
    async function loadMessages() {
      try {
        let endpoint = "";
        if (selectedRecipientId) {
          endpoint = `/api/inbox/messages?recipientId=${selectedRecipientId}`;
        } else if (selectedChannelId) {
          endpoint = `/api/inbox/messages?channelId=${selectedChannelId}`;
        } else {
          return;
        }

        const res = await fetch(endpoint);
        if (res.ok && isMounted) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedChannelId, selectedRecipientId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    try {
      let uploadedUrl: string | null = null;
      let uploadedName: string | null = null;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
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
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setInputMessage("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Message send error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const selectedColleague = useMemo(
    () => directoryUsers.find((u) => u.id === selectedRecipientId),
    [directoryUsers, selectedRecipientId]
  );

  const selectedChannel = useMemo(
    () => initialChannels.find((c) => c.id === selectedChannelId),
    [initialChannels, selectedChannelId]
  );

  const selectedNotification = useMemo(
    () => initialNotifications.find((n) => n.id === selectedNotificationId),
    [initialNotifications, selectedNotificationId]
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
          u.department?.name.toLowerCase().includes(q)
        );
      });
  }, [directoryUsers, currentUserId, searchQuery]);

  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return initialChannels.filter((c) => {
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.department?.name.toLowerCase().includes(q)
      );
    });
  }, [initialChannels, searchQuery]);

  return (
    <div className="w-full font-sans select-none overflow-hidden space-y-4">
      {/* 🧭 Top Search & Quick Capture */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-slate-200/80 bg-white/95 p-3.5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-purple-100 px-3 py-1 text-xs font-black text-purple-900 font-mono">
            {directoryUsers.length} Colleagues Connected
          </span>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Filter channels, team or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 sm:w-88 h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
          />
          <span className="absolute right-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>
      </div>

      {/* ▦ 3-Column Command Canvas (Viewport Bound + Dedicated Scrollbars) */}
      <div
        style={{ height: "calc(100vh - 215px)", maxHeight: "740px", minHeight: "520px" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch w-full overflow-hidden"
      >
        {/* PANEL 1: Channels & Feeds (Col 3) */}
        <div className="hidden md:flex md:col-span-3 flex-col rounded-[28px] border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl overflow-hidden">
          <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mb-3">
            CHANNELS & FEEDS
          </span>

          <nav className="space-y-1.5 flex-1 min-h-0 overflow-y-auto custom-kanban-scroll pr-1">
            {[
              { id: "ROOMS", label: "Group & Dept Rooms", icon: "👥" },
              { id: "DIRECT", label: "Direct Messages (1:1)", icon: "💬" },
              { id: "ALERTS", label: "Task Alerts", icon: "✓" },
              { id: "APPROVALS", label: "Approvals", icon: "🛡️" },
              { id: "ALL", label: "All Activity", icon: "⚡" },
            ].map((feed) => {
              const active = activeFeed === feed.id;
              return (
                <button
                  key={feed.id}
                  type="button"
                  onClick={() => setActiveFeed(feed.id as any)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                    active
                      ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <span>{feed.icon}</span>
                  <span>{feed.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* PANEL 2: Target Direct Messages / Channels List (Col 4) - Fixed Box with Scrollbar */}
        <div className="md:col-span-4 flex flex-col rounded-[28px] border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl overflow-hidden">
          {activeFeed === "DIRECT" && (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-1 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  DIRECT MESSAGES ({filteredColleagues.length})
                </span>
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black text-purple-700 font-mono">
                  {filteredColleagues.filter((u) => isOnline(u)).length} Online
                </span>
              </div>

              {/* Scrollable Members List */}
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2.5 pr-1.5 custom-kanban-scroll">
                {filteredColleagues.length === 0 ? (
                  <div className="py-20 text-center text-xs font-bold text-slate-400">
                    No colleagues found.
                  </div>
                ) : (
                  filteredColleagues.map((user) => {
                    const isSelected = selectedRecipientId === user.id;
                    const online = isOnline(user);

                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedRecipientId(user.id);
                          setSelectedChannelId(null);
                        }}
                        className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-400 bg-purple-50/70 shadow-xs ring-1 ring-purple-300"
                            : "border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-black text-white shadow-sm">
                              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                online ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                              {user.name || user.email.split("@")[0]}
                            </h4>
                            <p className="mt-0.5 text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                  online ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              />
                              <span>{online ? "Active" : "Offline"}</span>
                              <span>•</span>
                              <span className="truncate">{getRoleLabel(user.role)}</span>
                            </p>
                          </div>
                        </div>

                        <span className="text-xs font-black text-purple-600 hover:text-purple-800 transition shrink-0 ml-2">
                          Chat →
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {activeFeed === "ROOMS" && (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-1 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  ROOMS & CHANNELS ({filteredChannels.length})
                </span>
              </div>

              <div className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2.5 pr-1.5 custom-kanban-scroll">
                {filteredChannels.length === 0 ? (
                  <div className="py-20 text-center text-xs font-bold text-slate-400">
                    No active channels found.
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
                        className={`rounded-2xl border p-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? "border-purple-400 bg-purple-50/70 shadow-xs ring-1 ring-purple-300"
                            : "border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50 shadow-xs"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-black text-slate-900 truncate">{c.name}</h4>
                          <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-800 font-mono shrink-0">
                            {c.type === "COMPANY_ALL_HANDS" ? "COMPANY" : c.type}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400 line-clamp-1">
                          {c.description || (c.department ? `Dept: ${c.department.name}` : "Workspace Room")}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {["ALERTS", "APPROVALS", "ALL"].includes(activeFeed) && (
            <>
              <div className="border-b border-slate-100 pb-3 px-1 shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  ACTIVITY NOTIFICATIONS
                </span>
              </div>
              <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1.5 custom-kanban-scroll">
                {initialNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNotificationId(n.id)}
                    className={`rounded-2xl border p-3.5 transition-all cursor-pointer ${
                      selectedNotificationId === n.id
                        ? "border-purple-400 bg-purple-50/70 shadow-xs"
                        : "border-slate-100 bg-white hover:bg-slate-50 shadow-xs"
                    }`}
                  >
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1">{n.title || "Alert"}</h4>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{n.content}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* PANEL 3: Discussion Stream & Messages (Col 5) - Fixed Box with Scrollbar */}
        <div className="md:col-span-5 flex flex-col rounded-[28px] border border-slate-200/90 bg-white/95 p-5 shadow-xl backdrop-blur-xl overflow-hidden">
          {["ALERTS", "APPROVALS", "ALL"].includes(activeFeed) && selectedNotification ? (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5 custom-kanban-scroll">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 space-y-2.5">
                <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-800 font-mono">
                  {selectedNotification.category}
                </span>
                <h3 className="text-base font-black text-slate-900">{selectedNotification.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedNotification.content}
                </p>
              </div>
              {selectedNotification.link && (
                <Link href={selectedNotification.link}>
                  <Button className="w-full h-10 rounded-xl bg-slate-950 text-xs font-black text-white hover:bg-slate-800">
                    Open Linked Item →
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="border-b border-slate-100 pb-3 shrink-0">
                {selectedRecipientId && selectedColleague ? (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-black text-white shadow-xs">
                        {selectedColleague.name ? selectedColleague.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          isOnline(selectedColleague) ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {selectedColleague.name || selectedColleague.email}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-400">
                        {isOnline(selectedColleague) ? "Active in workspace" : "Offline"} •{" "}
                        {getRoleLabel(selectedColleague.role)}
                      </span>
                    </div>
                  </div>
                ) : selectedChannel ? (
                  <div>
                    <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight leading-snug">
                      {selectedChannel.name}
                    </h2>
                    <span className="text-[10px] font-black tracking-widest text-purple-600 uppercase">
                      {selectedChannel.type === "COMPANY_ALL_HANDS" ? "COMPANY" : selectedChannel.type} ROOM
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    Select a conversation to begin messaging
                  </span>
                )}
              </div>

              {/* Scrollable Message History */}
              <div
                ref={chatScrollRef}
                className="flex-1 min-h-0 overflow-y-auto space-y-3.5 py-4 pr-1.5 custom-kanban-scroll"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <span className="text-2xl mb-1">🎉</span>
                    <p className="text-xs font-bold max-w-[260px] leading-relaxed">
                      No messages in this channel yet. Say hello or share deliverables below!
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender.id === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
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
                              {/\.(jpg|jpeg|png|webp|gif)$/i.test(m.mediaUrl) ? (
                                <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={m.mediaUrl}
                                    alt={m.mediaName || "attachment"}
                                    className="max-h-48 max-w-full rounded-xl object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={m.mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-xl bg-white/20 p-2 text-[11px] font-black"
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

              {/* Fixed Bottom Input Bar */}
              {(selectedRecipientId || selectedChannelId) && (
                <div className="border-t border-slate-100 pt-3 shrink-0 space-y-2">
                  {selectedFile && (
                    <div className="flex items-center justify-between bg-purple-100/80 border border-purple-300 px-3 py-1.5 rounded-xl text-[11px] font-bold text-purple-900">
                      <span className="truncate max-w-[240px]">📎 Ready: {selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-purple-950 font-black cursor-pointer ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition cursor-pointer text-base shadow-xs"
                      title="Attach file"
                    >
                      📎
                    </button>

                    <input
                      type="text"
                      placeholder="Write a message or drop deliverables..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition"
                    />

                    <Button
                      type="submit"
                      disabled={isSending || (!inputMessage.trim() && !selectedFile)}
                      className="h-10 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black px-4 shadow-sm transition cursor-pointer"
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
    </div>
  );
}