"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  memberCode?: string | null;
  role?: { name: string } | null;
  department?: { id: string; name: string } | null;
  presenceStatus?: string | null;
  taskAssignments?: Array<{ id: string }>;
}

interface DepartmentItem {
  id: string;
  name: string;
}

interface TeamDirectoryProps {
  initialMembers: TeamMemberItem[];
  departments: DepartmentItem[];
  currentUserId: string;
  currentUserRole: string;
}

export function TeamDirectoryClient({
  initialMembers = [],
  departments = [],
  currentUserId,
  currentUserRole,
}: TeamDirectoryProps) {
  const router = useRouter();

  const [members, setMembers] = useState<TeamMemberItem[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("EMPLOYEE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdHandle, setCreatedHandle] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.memberCode?.toLowerCase().includes(q) ||
      m.department?.name?.toLowerCase().includes(q)
    );
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(`@${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setCreatedHandle(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          departmentName: departmentName.trim(),
          password: password.trim() || undefined,
          roleName,
        }),
      });

      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [...prev, newMember]);
        setCreatedHandle(newMember.memberCode);
        setName("");
        setEmail("");
        setDepartmentName("");
        setPassword("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create account");
      }
    } catch {
      alert("Network communication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-8 font-sans select-none relative">
      {/* 🔮 Background Magical Ambient Glow */}
      <div className="pointer-events-none absolute -top-12 left-1/4 h-80 w-80 rounded-full bg-purple-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -right-12 h-96 w-96 rounded-full bg-indigo-500/15 blur-[140px]" />

      {/* 🎉 Interactive Created Notification Banner */}
      {createdHandle && (
        <div className="relative overflow-hidden rounded-[30px] border-2 border-emerald-400/80 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-5 shadow-xl shadow-emerald-500/15 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-2xl text-white shadow-lg shadow-emerald-500/30">
                ✨
              </span>
              <div>
                <h4 className="text-base font-black text-emerald-950">
                  Agent Profile Initialized & Ready!
                </h4>
                <p className="text-xs font-semibold text-emerald-800">
                  Unique Assignment Code:{" "}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(createdHandle)}
                    className="ml-1 inline-flex items-center gap-1.5 rounded-xl bg-emerald-200/90 px-3 py-1 font-mono text-sm font-black text-emerald-950 shadow-xs hover:bg-emerald-300 transition cursor-pointer"
                    title="Click to copy"
                  >
                    <span>@{createdHandle}</span>
                    <span className="text-[11px] font-sans font-bold text-emerald-800">
                      {copiedCode === createdHandle ? "✓ Copied!" : "📋 Copy"}
                    </span>
                  </button>
                  <span className="ml-2 font-normal text-emerald-700">
                    (Use @{createdHandle} in Quick Capture to instantly route tasks)
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreatedHandle(null)}
              className="h-8 w-8 rounded-full bg-emerald-200/60 text-sm font-black text-emerald-900 hover:bg-emerald-300 transition flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ▦ Core 2-Column Responsive Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* PANEL 1: Active Member Directory (7 Cols) */}
        <div className="lg:col-span-7 rounded-[38px] border border-white/80 bg-white/95 p-7 md:p-8 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-purple-600 animate-ping" />
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Active Workspace Directory
                </h3>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Colleagues with unique handles, notifications, and departments.
              </p>
            </div>
            <span className="rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-100 px-4 py-1.5 text-xs font-black text-purple-900 font-mono shadow-xs border border-purple-200/70">
              {members.length} Agents Enrolled
            </span>
          </div>

          {/* Search Input with Neon Violet Focus Ring */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, department, or @handle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-13 rounded-2xl border-2 border-purple-200/90 bg-purple-50/20 px-5 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/20 shadow-xs transition-all"
            />
            <span className="absolute right-4 top-3.5 text-slate-400 text-lg">🔍</span>
          </div>

          {/* Members Feed */}
          <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
            {filteredMembers.length === 0 ? (
              <div className="py-24 text-center text-sm font-semibold text-slate-400">
                No matching agents found in directory.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const activeTasks = m.taskAssignments?.length || 0;
                const roleClean = m.role?.name || "EMPLOYEE";
                const handleRaw = m.memberCode || m.name.replace(/[^a-zA-Z]/g, "").toLowerCase();
                const isCopied = copiedCode === handleRaw;

                return (
                  <div
                    key={m.id}
                    className="group flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4.5 shadow-sm hover:border-purple-300 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* 3D Vibrant Metallic Avatar */}
                      <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 text-lg font-black text-white shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
                        {m.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900 tracking-tight">
                            {m.name}
                          </h4>

                          {/* Clickable Quick-Copy Tag */}
                          <button
                            type="button"
                            onClick={() => handleCopyCode(handleRaw)}
                            className={`rounded-xl border px-2.5 py-0.5 text-xs font-black font-mono shadow-2xs transition-all cursor-pointer ${
                              isCopied
                                ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                                : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-300"
                            }`}
                            title="Click to copy assignment tag"
                          >
                            @{handleRaw} {isCopied && "✓"}
                          </button>
                        </div>

                        <p className="text-xs font-semibold text-slate-500">{m.email}</p>
                        <span className="inline-block text-xs font-bold text-slate-400">
                          {m.department ? `🏢 ${m.department.name}` : "📁 General Workspace"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="rounded-2xl bg-purple-50 px-3.5 py-1.5 text-xs font-black text-purple-800 border border-purple-200/80 shadow-2xs">
                        {activeTasks} Active Tasks
                      </span>

                      <span
                        className={`rounded-2xl px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                          roleClean === "ADMIN"
                            ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {roleClean}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: Add New Agent / Employee Form (5 Cols) */}
        <div className="lg:col-span-5 rounded-[38px] border border-white/80 bg-white/95 p-7 md:p-8 shadow-2xl shadow-slate-200/60 backdrop-blur-2xl space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Add New Agent / Employee
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Creates account, issues unique @handle, connects department, and generates login keys.
            </p>
          </div>

          <form onSubmit={handleCreateMember} className="space-y-4.5">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Agent Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Umang Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full h-12 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/15 shadow-xs transition"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Official Work Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. umang@taskflow.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full h-12 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/15 shadow-xs transition"
              />
              <span className="text-[11px] font-semibold text-slate-400 mt-1 block">
                Direct task alert notifications and emergency broadcasts route here.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/15 shadow-xs transition"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Role
                </label>
                <select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="mt-1.5 w-full h-12 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-3 text-sm font-bold text-slate-900 outline-none focus:border-purple-600 focus:bg-white cursor-pointer shadow-xs transition"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Admin / Lead</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                Temporary Password
              </label>
              <input
                type="password"
                placeholder="•••••••• (Default: Taskflow@2026)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full h-12 rounded-2xl border border-slate-200/90 bg-slate-50/50 px-4 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-400/15 shadow-xs transition"
              />
            </div>

            {/* 🚀 Magical Shimmer Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim()}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 text-sm font-black text-white hover:from-purple-900 hover:to-indigo-950 hover:shadow-xl hover:shadow-purple-900/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border border-purple-500/30 shadow-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Generating Unique Handle...
                  </span>
                ) : (
                  "✨ Create Agent Account & Generate Handle"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}