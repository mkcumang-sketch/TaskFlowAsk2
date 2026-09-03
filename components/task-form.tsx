"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AiTaskModal } from "@/components/ai-task-modal";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
}

export function TaskForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch("/api/team/members")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data);
        }
      })
      .catch((err) => console.error("Failed to load team members:", err));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    setLoading(true);
    setMessage(null);

    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      assigneeEmail: String(formData.get("assigneeEmail") || ""),
      startAt: String(formData.get("startAt") || ""),
      dueAt: String(formData.get("dueAt") || ""),
      estimatedMinutes: Number(formData.get("estimatedMinutes") || 0),
      tags: String(formData.get("tags") || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      checklist: String(formData.get("checklist") || "")
        .split("\n")
        .map((item) => ({ text: item.trim() }))
        .filter((item) => item.text),
      priority: String(formData.get("priority") || "MEDIUM"),
      status: String(formData.get("taskStatus") || "ASSIGNED"),
      taskStatus: String(formData.get("taskStatus") || "ASSIGNED"),
      completionProofType: String(formData.get("completionProofType") || "NONE"),
      approvalRequired: formData.get("approvalRequired") === "on",
      calendarSyncEnabled: formData.get("calendarSyncEnabled") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
    };

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Task creation failed.");
        setLoading(false);
        return;
      }

      setMessage("Task created successfully.");
      form.reset();
      window.location.reload();
    } catch {
      setMessage("Failed to submit task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-base font-bold text-slate-900">Create Task</h3>
        <AiTaskModal />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Task title</label>
        <input
          name="title"
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          placeholder="e.g. Audit Q3 vendor invoices"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          placeholder="Scope, deliverables, and expectations"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Dynamic Team Member Dropdown */}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Assign To Agent</label>
          <select
            name="assigneeEmail"
            required
            defaultValue=""
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
          >
            <option value="" disabled>Select an agent...</option>
            {members.map((member) => (
              <option key={member.id} value={member.email}>
                {member.name ? `${member.name} (${member.email})` : member.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Deadline (Due Date)</label>
          <input
            name="dueAt"
            type="datetime-local"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Start date</label>
          <input
            name="startAt"
            type="datetime-local"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Estimated minutes</label>
          <input
            name="estimatedMinutes"
            type="number"
            min="15"
            step="15"
            defaultValue={60}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
          <select
            name="priority"
            defaultValue="MEDIUM"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 bg-white"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Completion Proof</label>
          <select
            name="completionProofType"
            defaultValue="NONE"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 bg-white"
          >
            <option value="NONE">None</option>
            <option value="TEXT">Text Notes / Summary</option>
            <option value="PDF">PDF File / Document</option>
            <option value="EXCEL">Excel Spreadsheet</option>
            <option value="CSV">CSV Data</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tags (comma-separated)</label>
          <input
            name="tags"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
            placeholder="operations, urgent, finance"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Checklist (one item per line)
        </label>
        <textarea
          name="checklist"
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
          placeholder="Step 1&#10;Step 2&#10;Step 3"
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="approvalRequired" defaultChecked />
          Manager approval required
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="calendarSyncEnabled" defaultChecked />
          Google Calendar sync
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="emailEnabled" defaultChecked />
          Email notification
        </label>
      </div>

      {message && (
        <p
          className={`text-sm font-medium ${
            message.includes("successfully") ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Assigning Task..." : "Assign Task"}
      </Button>
    </form>
  );
}