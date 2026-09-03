"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AddAgentForm() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setMsg(null);

    const formData = new FormData(form);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const res = await fetch("/api/team/add-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setMsg({ text: data.error || "Failed to create agent", success: false });
        return;
      }

      setMsg({ text: `Agent ${payload.name} successfully added!`, success: true });
      form.reset();
      window.location.reload();
    } catch {
      setMsg({ text: "Server error. Try again.", success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-slate-900">Add New Agent / Employee</h3>
      <p className="mt-1 text-xs text-slate-500 mb-4">
        Create an account for your agent. They can login using these details to view their tasks.
      </p>

      <form onSubmit={handleAdd} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Name</label>
          <input
            name="name"
            required
            placeholder="e.g. Rahul Verma"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="rahul@ask2global.com"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
          />
        </div>

        {msg && (
          <p className={`text-xs font-semibold ${msg.success ? "text-emerald-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Adding Agent..." : "Create Agent Account"}
        </Button>
      </form>
    </div>
  );
}