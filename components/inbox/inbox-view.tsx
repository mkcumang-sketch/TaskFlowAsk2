"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  lastMessageAt?: string | Date | null;
}

export interface InboxMessage {
  id: string;
  content: string;
  mediaUrl?: string | null;
  mediaName?: string | null;
  createdAt: string | Date;
  sender: { id: string; name: string | null; email: string };
}

export interface InboxViewProps {
  initialNotifications?: any[];
  initialChannels?: InboxChannel[];
  directoryUsers?: InboxUser[];
  currentUserId: string;
  currentUserRole?: string | null;
}

interface ChatItem {
  id: string;
  targetId: string;
  name: string;
  isGroup: boolean;
  subtitle: string;
  avatarText: string;
  isOnline: boolean;
  timestamp?: string;
  badge?: string;
}

export function InboxView({
  initialChannels = [],
  directoryUsers = [],
  currentUserId,
}: InboxViewProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"ALL" | "GROUPS" | "DIRECT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Mobile navigation: false = Chat List screen, true = Active Chat screen
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const checkIsOnline = (user: InboxUser) => {
    if (user.id === currentUserId) return true;
    if (user.presenceStatus === "ONLINE") return true;
    const ts = user.lastSeenAt || user.updatedAt;
    if (!ts) return false;
    return (Date.now() - new Date(ts).getTime()) / (1000 * 60) < 10;
  };

  // WhatsApp / Telegram Unified Chat List
  const chatItems = useMemo(() => {
    const list: ChatItem[] = [];

    // Groups & Department Rooms
    if (activeTab === "ALL" || activeTab === "GROUPS") {
      initialChannels.forEach((ch) => {
        list.push({
          id: `channel_${ch.id}`,
          targetId: ch.id,
          name: ch.name || (ch.department ? `${ch.department.name} Team` : "Group Chat"),
          isGroup: true,
          subtitle: ch.description || "Official group room",
          avatarText: (ch.name || "G").charAt(0).toUpperCase(),
          isOnline: true,
          timestamp: ch.lastMessageAt
            ? new Date(ch.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : undefined,
          badge: ch.department?.name || "GROUP",
        });
      });
    }

    // Direct Messages (1:1)
    if (activeTab === "ALL" || activeTab === "DIRECT") {
      directoryUsers
        .filter((u) => u.id !== currentUserId)
        .forEach((u) => {
          const online = checkIsOnline(u);
          const roleLabel =
            typeof u.role === "string"
              ? u.role
              : u.role?.name || u.department?.name || "Member";

          list.push({
            id: `user_${u.id}`,
            targetId: u.id,
            name: u.name || u.email.split("@")[0],
            isGroup: false,
            subtitle: online ? "online" : "last seen recently",
            avatarText: (u.name || u.email).charAt(0).toUpperCase(),
            isOnline: online,
            badge: roleLabel,
          });
        });
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.badge?.toLowerCase().includes(q)
    );
  }, [initialChannels, directoryUsers, currentUserId, activeTab, searchQuery]);

  // Desktop default selection
  useEffect(() => {
    if (!selectedChat && chatItems.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setSelectedChat(chatItems[0]);
    }
  }, [chatItems, selectedChat]);

  // Poll messages for active chat
  useEffect(() => {
    if (!selectedChat) return;

    let isMounted = true;
    async function loadMessages() {
      try {
        const endpoint = selectedChat?.isGroup
          ? `/api/inbox/messages?channelId=${selectedChat?.targetId}`
          : `/api/inbox/messages?recipientId=${selectedChat?.targetId}`;

        const res = await fetch(endpoint);
        if (res.ok && isMounted) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedChat]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedFile) || isSending || !selectedChat) return;

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

      const payload: any = {
        content: inputMessage.trim(),
        mediaUrl: uploadedUrl,
        mediaName: uploadedName,
      };

      if (selectedChat.isGroup) {
        payload.channelId = selectedChat.targetId;
      } else {
        payload.recipientId = selectedChat.targetId;
      }

      const res = await fetch("/api/inbox/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        setInputMessage("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenChat = (item: ChatItem) => {
    setSelectedChat(item);
    setMobileChatOpen(true);
  };

  return (
    <div
      style={{ height: "calc(100vh - 150px)", minHeight: "520px" }}
      className="relative flex w-full overflow-hidden rounded-2xl md:rounded-[28px] border border-slate-200/90 bg-white shadow-xl select-none"
    >
      {/* 🟢 VIEW 1: WhatsApp / Telegram Left Chat List */}
      <div
        className={`w-full md:w-88 lg:w-96 flex flex-col border-r border-slate-200/80 bg-white shrink-0 ${
          mobileChatOpen ? "hidden md:flex" : "flex"
        }`}
      >
        {/* WhatsApp Top Search & Filter Bar */}
        <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 transition"
            />
            <span className="absolute left-3 top-2 text-xs text-slate-400">🔍</span>
          </div>

          {/* Quick Filter Pills (All / Groups / Direct) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition cursor-pointer ${
                activeTab === "ALL"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-200/70 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("GROUPS")}
              className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition cursor-pointer ${
                activeTab === "GROUPS"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-200/70 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Groups
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DIRECT")}
              className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide transition cursor-pointer ${
                activeTab === "DIRECT"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-200/70 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Direct (1:1)
            </button>
          </div>
        </div>

        {/* Clean WhatsApp Style Chat Item List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 custom-kanban-scroll">
          {chatItems.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No conversations found.
            </div>
          ) : (
            chatItems.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleOpenChat(chat)}
                  className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition active:bg-slate-100 ${
                    isSelected
                      ? "bg-purple-50/90 border-l-4 border-purple-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Circular Avatar with Status Dot */}
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-black shadow-xs ${
                        chat.isGroup
                          ? "bg-gradient-to-tr from-amber-500 to-orange-600 text-white"
                          : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white"
                      }`}
                    >
                      {chat.avatarText}
                    </div>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {chat.isGroup ? `👥 ${chat.name}` : chat.name}
                      </h4>
                      {chat.timestamp && (
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {chat.timestamp}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[11px] font-medium text-slate-500 truncate leading-tight">
                        {chat.subtitle}
                      </p>
                      {chat.badge && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded font-mono bg-slate-100 text-slate-600 shrink-0 ml-1">
                          {chat.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 💬 VIEW 2: WhatsApp / Telegram Chat Conversation Screen */}
      <div
        className={`flex-1 flex flex-col bg-[#efeae2]/40 relative overflow-hidden ${
          !mobileChatOpen ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedChat ? (
          <>
            {/* Header with Mobile Back Arrow (←) */}
            <div className="h-15 border-b border-slate-200/80 bg-white px-3 sm:px-5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* ⬅ Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileChatOpen(false)}
                  className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition cursor-pointer shrink-0 font-bold"
                  aria-label="Back to chat list"
                >
                  ←
                </button>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shrink-0 ${
                    selectedChat.isGroup
                      ? "bg-gradient-to-tr from-amber-500 to-orange-600"
                      : "bg-purple-600"
                  }`}
                >
                  {selectedChat.avatarText}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate">
                    {selectedChat.isGroup ? `👥 ${selectedChat.name}` : selectedChat.name}
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400 block truncate">
                    {selectedChat.isGroup
                      ? "Department Team Channel"
                      : selectedChat.isOnline
                      ? "online"
                      : "offline"}
                  </span>
                </div>
              </div>
            </div>

            {/* WhatsApp/Telegram Message Flow */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-3 custom-kanban-scroll"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold text-center px-4">
                  <span className="text-3xl mb-1">💬</span>
                  No messages yet. Send a greeting to start the thread!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender.id === currentUserId;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-bold text-slate-500 mb-0.5 ml-2">
                          {m.sender.name || m.sender.email}
                        </span>
                      )}

                      {/* Message Bubble with Tails */}
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs shadow-xs relative ${
                          isMe
                            ? "bg-purple-600 text-white rounded-br-xs"
                            : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}

                        {m.mediaUrl && (
                          <div className="mt-2">
                            {/\.(jpg|jpeg|png|webp|gif)$/i.test(m.mediaUrl) ? (
                              <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={m.mediaUrl}
                                  alt="attachment"
                                  className="max-h-52 max-w-full rounded-xl object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={m.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 p-2 rounded-xl text-[11px] font-bold ${
                                  isMe ? "bg-white/20 text-white" : "bg-slate-100 text-slate-800"
                                }`}
                              >
                                <span>📎</span>
                                <span className="truncate">{m.mediaName || "Attached Deliverable"}</span>
                              </a>
                            )}
                          </div>
                        )}

                        <span
                          className={`text-[9px] font-mono block text-right mt-1 ${
                            isMe ? "text-purple-200" : "text-slate-400"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Input Field */}
            <div className="p-2.5 sm:p-3 border-t border-slate-200/80 bg-white shrink-0">
              {selectedFile && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 px-3 py-1 rounded-xl text-xs text-purple-900 mb-2">
                  <span className="truncate max-w-[200px] sm:max-w-xs font-bold">📎 {selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="font-black text-purple-700 cursor-pointer"
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
                  className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 text-lg transition cursor-pointer shrink-0"
                  title="Attach file"
                >
                  📎
                </button>

                <input
                  type="text"
                  placeholder="Type a message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 h-10 rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition"
                />

                <Button
                  type="submit"
                  disabled={!inputMessage.trim() && !selectedFile}
                  className="h-10 w-10 rounded-full bg-purple-600 hover:bg-purple-700 text-white p-0 flex items-center justify-center cursor-pointer shadow-sm transition shrink-0"
                >
                  ➤
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400 p-4 text-center">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}