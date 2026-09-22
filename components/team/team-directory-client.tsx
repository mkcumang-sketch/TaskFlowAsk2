"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Department {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
  memberCode?: string | null;
  presenceStatus?: string | null;
  role?: { name: string } | null;
  department?: { id: string; name: string } | null;
}

interface TeamDirectoryClientProps {
  initialMembers?: Member[];
  departments?: Department[];
  currentUserId?: string;
  currentUserRole?: string | null;
}

export function TeamDirectoryClient({
  initialMembers = [],
  departments = [],
  currentUserId,
  currentUserRole = "EMPLOYEE",
}: TeamDirectoryClientProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id || "NEW");
  const [customDeptName, setCustomDeptName] = useState("");
  const [roleName, setRoleName] = useState("EMPLOYEE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const filteredMembers = initialMembers.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.department?.name.toLowerCase().includes(q)
    );
  });

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        roleName,
      };

      if (selectedDeptId === "NEW") {
        payload.departmentName = customDeptName.trim();
      } else {
        payload.departmentId = selectedDeptId;
        const matched = departments.find((d) => d.id === selectedDeptId);
        if (matched) payload.departmentName = matched.name;
      }

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowAddModal(false);
        setName("");
        setEmail("");
        setCustomDeptName("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add employee");
      }
    } catch {
      alert("Network communication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none">
      {/* Top Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search colleagues or departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white transition"
          />
          <span className="absolute left-2.5 top-3 text-xs text-slate-400">🔍</span>
        </div>

        <Button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white px-5 h-10 shadow-sm cursor-pointer"
        >
          + Add Employee
        </Button>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-purple-300 transition"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-sm font-black text-white shadow-xs">
              {member.name ? member.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900 truncate">
                {member.name || member.email}
              </h4>
              <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-purple-700 font-mono">
                  {member.role?.name || "EMPLOYEE"}
                </span>
                {member.department && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                    🏢 {member.department.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add Employee with Department Dropdown */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 font-mono">
                  TEAM MANAGEMENT
                </span>
                <h3 className="text-lg font-black text-slate-900">Authorize New Employee</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700">Full Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Priyanshu Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-700">Google Email *</label>
                <input
                  required
                  type="email"
                  placeholder="priyanshu@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-purple-600 focus:bg-white transition"
                />
              </div>

              {/* Department Dropdown */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-700">
                  Select Department (Auto-creates Group Chat)
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-purple-600 cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      🏢 {dept.name}
                    </option>
                  ))}
                  <option value="NEW">+ Create New Department...</option>
                </select>
              </div>

              {selectedDeptId === "NEW" && (
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-700">New Department Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Design & Architecture"
                    value={customDeptName}
                    onChange={(e) => setCustomDeptName(e.target.value)}
                    className="mt-1 w-full h-10 rounded-xl border border-purple-300 bg-purple-50/40 px-3.5 text-xs font-bold text-slate-900 outline-none focus:border-purple-600 transition"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-black uppercase text-slate-700">Role</label>
                <select
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-purple-600 cursor-pointer"
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-black text-white px-5 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? "Authorizing..." : "Add & Link Group"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}