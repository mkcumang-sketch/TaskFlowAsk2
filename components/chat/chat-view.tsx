"use client";

import { useState } from "react";

interface DirectMessageUser {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
  avatarLetter?: string;
}

interface ChatViewProps {
  directMessages?: DirectMessageUser[];
  activeRoomName?: string;
  roomType?: string;
}

const DEFAULT_USERS: DirectMessageUser[] = [
  { id: "1", name: "AMANDEEP SINGH", role: "ADMIN", isOnline: true, avatarLetter: "A" },
  { id: "2", name: "Abhishek Yadav", role: "EMPLOYEE", isOnline: true, avatarLetter: "A" },
  { id: "3", name: "Abhishekh Tripathi", role: "EMPLOYEE", isOnline: false, avatarLetter: "A" },
  { id: "4", name: "Adarsh kumar", role: "MANAGER", isOnline: true, avatarLetter: "A" },
  { id: "5", name: "Ashwini Gour", role: "EMPLOYEE", isOnline: true, avatarLetter: "A" },
  { id: "6", name: "Danav", role: "LEAD", isOnline: true, avatarLetter: "D" },
  { id: "7", name: "Gaurav Verma", role: "EMPLOYEE", isOnline: false, avatarLetter: "G" },
  { id: "8", name: "Nitesh Sharma", role: "DESIGNER", isOnline: true, avatarLetter: "N" },
  { id: "9", name: "Pooja Patel", role: "EMPLOYEE", isOnline: false, avatarLetter: "P" },
  { id: "10", name: "Rahul Gupta", role: "EMPLOYEE", isOnline: true, avatarLetter: "R" },
  { id: "11", name: "Rishabh", role: "DEVELOPER", isOnline: true, avatarLetter: "R" },
];

export function ChatView({
  directMessages = DEFAULT_USERS,
  activeRoomName = "SALES & PROCUREMENT COSTING AND PRICING",
  roomType = "DEPARTMENT ROOM",
}: ChatViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("1");
  const [messageText, setMessageText] = useState("");
  const [activeTab, setActiveTab] = useState<"ROOMS" | "DM" | "ALERTS" | "APPROVALS" | "ACTIVITY">("DM");

  return (
    <div className="w-full font-sans select-none overflow-hidden">
      {/* 3-Column Layout Locked To Screen Viewport */}
      <div
        style={{ height: "calc(100vh - 210px)", maxHeight: "720px", minHeight: "520px" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch w-full overflow-hidden"
      >
        {/* Left Sub-Sidebar: Channels & Feeds (Col 3) */}
        <div className="hidden md:flex md:col-span-3 flex-col rounded-[28px] border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl overflow-hidden">
          <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mb-3">
            CHANNELS & FEEDS
          </span>

          <nav className="space-y-1.5 flex-1 overflow-y-auto custom-kanban-scroll pr-1">
            <button
              type="button"
              onClick={() => setActiveTab("ROOMS")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "ROOMS"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span>👥</span>
              <span>Group & Dept Rooms</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("DM")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "DM"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span>💬</span>
              <span>Direct Messages (1:1)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ALERTS")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "ALERTS"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span>✓</span>
              <span>Task Alerts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("APPROVALS")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "APPROVALS"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span>🛡️</span>
              <span>Approvals</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ACTIVITY")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "ACTIVITY"
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <span>⚡</span>
              <span>All Activity</span>
            </button>
          </nav>
        </div>

        {/* Center Marked Box: DIRECT MESSAGES LIST (Col 4) with Internal Scrollbar */}
        <div className="md:col-span-4 flex flex-col rounded-[28px] border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 px-1 shrink-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              DIRECT MESSAGES ({directMessages.length})
            </span>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-black text-purple-700 font-mono">
              Online ({directMessages.filter((u) => u.isOnline).length})
            </span>
          </div>

          {/* Scrollable List of Direct Message Users */}
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2.5 pr-1.5 custom-kanban-scroll">
            {directMessages.map((user) => {
              const isSelected = selectedUserId === user.id;

              return (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-purple-400 bg-purple-50/60 shadow-sm ring-1 ring-purple-300"
                      : "border-slate-100 bg-white hover:border-purple-200 hover:bg-slate-50/80 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-black text-white shadow-sm shadow-purple-500/25">
                        {user.avatarLetter || user.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          user.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">
                        {user.name}
                      </h4>
                      <p className="mt-0.5 text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.isOnline ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span>{user.isOnline ? "Active" : "Offline"}</span>
                        <span>•</span>
                        <span>{user.role}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-purple-600 hover:text-purple-800 transition">
                    Chat →
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Active Room / Discussion Box (Col 5) */}
        <div className="md:col-span-5 flex flex-col rounded-[28px] border border-slate-200/90 bg-white/95 p-5 shadow-xl backdrop-blur-xl overflow-hidden">
          {/* Room Header */}
          <div className="border-b border-slate-100 pb-3 shrink-0">
            <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight leading-snug">
              {activeRoomName}
            </h2>
            <span className="text-[10px] font-black tracking-widest text-purple-600 uppercase">
              {roomType}
            </span>
          </div>

          {/* Conversation Stream (Scrollable) */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4 pr-1.5 custom-kanban-scroll flex flex-col justify-center items-center text-center">
            <span className="text-2xl">🎉</span>
            <p className="text-xs font-bold text-slate-400 max-w-[280px] leading-relaxed">
              No messages in this channel yet. Say hello or share deliverables below!
            </p>
          </div>

          {/* Fixed Bottom Message Bar */}
          <div className="border-t border-slate-100 pt-3 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!messageText.trim()) return;
                setMessageText("");
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Write a message or drop task files..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-xs font-semibold text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition"
              />
              <button
                type="submit"
                className="h-10 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-purple-700 transition cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}