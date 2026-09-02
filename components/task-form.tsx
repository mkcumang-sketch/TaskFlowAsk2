"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TaskForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      assigneeEmail: String(formData.get("assigneeEmail") || ""),
      dueAt: String(formData.get("dueAt") || ""),
      priority: String(formData.get("priority") || "MEDIUM"),
      taskStatus: String(formData.get("taskStatus") || "ASSIGNED"),
      calendarSyncEnabled: formData.get("calendarSyncEnabled") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
    };

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
    setLoading(false);
    event.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Task title</label>
        <input name="title" required className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900" placeholder="Vendor research" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea name="description" rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900" placeholder="Scope, proof, and key details" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Assignee email</label>
          <input name="assigneeEmail" type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900" placeholder="rahul@company.com" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
          <input name="dueAt" type="datetime-local" className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
          <select name="priority" defaultValue="MEDIUM" className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select name="taskStatus" defaultValue="ASSIGNED" className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900">
            <option value="ASSIGNED">Assigned</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="calendarSyncEnabled" defaultChecked />
          Calendar sync
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="emailEnabled" defaultChecked />
          Email alert
        </label>
      </div>

      {message ? <p className="text-sm text-slate-700">{message}</p> : null}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating task..." : "Create task"}
      </Button>
    </form>
  );
}
