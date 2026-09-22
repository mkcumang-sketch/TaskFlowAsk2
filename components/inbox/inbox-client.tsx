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

interface ChatThread {
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

export function InboxClient({
  initialNotifications = [],
  initialChannels = [],
  directoryUsers = [],
  currentUserId,
  currentUserRole = "EMPLOYEE",
}: InboxClientProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const checkIsOnline = (user: InboxUser) => {
    if (user.id === currentUserId) return true;
    if (user.presenceStatus === "ONLINE") return true;
    const ts = user.lastSeenAt || user.updatedAt;
    if (!ts) return false;
    return (Date.now() - new Date(ts).getTime()) / (1000 * 60) < 10;
  };

  // Build Telegram thread list combining group rooms and direct contacts
  const threads = useMemo(() => {
    const list: ChatThread[] = [];

    // 1. Department & Team Groups
    initialChannels.forEach((ch) => {
      list.push({
        id: `group_${ch.id}`,
        targetId: ch.id,
        name: ch.name || (ch.department ? `${ch.department.name} Team` : "Group Room"),
        isGroup: true,
        subtitle: ch.description || "Official department chat",
        avatarText: (ch.name || "D").charAt(0).toUpperCase(),
        isOnline: true,
        timestamp: ch.lastMessageAt
          ? new Date(ch.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : undefined,
        badge: ch.department?.name || "GROUP",
      });
    });

    // 2. Direct Contacts (1:1 Telegram Users)
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

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.badge?.toLowerCase().includes(q)
    );
  }, [initialChannels, directoryUsers, currentUserId, searchQuery]);

  // Default selection
  useEffect(() => {
    if (!selectedChat && threads.length > 0) {
      setSelectedChat(threads[0]);
    }
  }, [threads, selectedChat]);

  // Poll chat messages
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

  // Dispatch message
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{ height: "calc(100vh - 190px)", minHeight: "560px", maxHeight: "820px" }}
      className="flex w-full overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-xl select-none"
    >
      {/* 📱 LEFT COLUMN: Telegram Threads List */}
      <div className="w-80 sm:w-96 flex flex-col border-r border-slate-200/80 bg-slate-50/50 shrink-0">
        {/* Search header */}
        <div className="p-3.5 border-b border-slate-200/80 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 rounded-full border border-slate-200 bg-slate-100/80 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>
        </div>

        {/* Scrollable contact and group list */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 custom-kanban-scroll">
          {threads.length === 0 ? (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No chats found.
            </div>
          ) : (
            threads.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer transition ${
                    isSelected
                      ? "bg-purple-600 text-white"
                      : "hover:bg-slate-100 text-slate-900"
                  }`}
                >
                  {/* Telegram Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-black shadow-xs ${
                        isSelected
                          ? "bg-white text-purple-700"
                          : chat.isGroup
                          ? "bg-gradient-to-tr from-amber-500 to-orange-600 text-white"
                          : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white"
                      }`}
                    >
                      {chat.avatarText}
                    </div>
                    {chat.isOnline && (
                      <span
                        className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 ${
                          isSelected ? "border-purple-600 bg-emerald-400" : "border-white bg-emerald-500"
                        }`}
                      />
                    )}
                  </div>

                  {/* Thread metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-black truncate leading-tight ${
                          isSelected ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {chat.isGroup ? `👥 ${chat.name}` : chat.name}
                      </h4>
                      {chat.timestamp && (
                        <span
                          className={`text-[10px] font-mono shrink-0 ${
                            isSelected ? "text-purple-200" : "text-slate-400"
                          }`}
                        >
                          {chat.timestamp}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p
                        className={`text-[11px] truncate leading-tight ${
                          isSelected ? "text-purple-100" : "text-slate-500"
                        }`}
                      >
                        {chat.subtitle}
                      </p>
                      {chat.badge && (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded font-mono shrink-0 ml-1.5 ${
                            isSelected
                              ? "bg-purple-700 text-purple-100"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
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

      {/* 💬 RIGHT COLUMN: Telegram Active Chat */}
      <div className="flex-1 flex flex-col bg-[#eef1f5]/60 relative overflow-hidden">
        {selectedChat ? (
          <>
            {/* Telegram Header */}
            <div className="h-16 border-b border-slate-200/80 bg-white px-5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white ${
                    selectedChat.isGroup
                      ? "bg-gradient-to-tr from-amber-500 to-orange-600"
                      : "bg-purple-600"
                  }`}
                >
                  {selectedChat.avatarText}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {selectedChat.isGroup ? `👥 ${selectedChat.name}` : selectedChat.name}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">
                    {selectedChat.isGroup
                      ? "Department Group"
                      : selectedChat.isOnline
                      ? "online"
                      : "offline"}
                  </span>
                </div>
              </div>
            </div>

            {/* Telegram Message Stream */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-kanban-scroll"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold text-center">
                  <span className="text-3xl mb-1">💬</span>
                  No messages yet. Send a greeting to start the conversation!
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

                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-xs relative ${
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
                                  className="max-h-56 max-w-full rounded-xl object-cover"
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

            {/* Telegram Input Bar */}
            <div className="p-3 border-t border-slate-200/80 bg-white shrink-0">
              {selectedFile && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-xl text-xs text-purple-900 mb-2">
                  <span className="truncate max-w-xs font-bold">📎 {selectedFile.name}</span>
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
                  className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 text-lg transition cursor-pointer"
                  title="Attach file"
                >
                  📎
                </button>

                <input
                  type="text"
                  placeholder="Write a message..."
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
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}