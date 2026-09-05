"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AiTaskModal, ParsedTaskData } from "@/components/ai-task-modal";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
}

export function TaskForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Controlled form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [priority, setPriority] = useState("P2");

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

  const handleAiParsed = (data: ParsedTaskData) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);

    // AI priority mapping to P1-P5
    if (data.priority) {
      const p = data.priority.toUpperCase();
      if (p.includes("1") || p.includes("URGENT") || p.includes("INSTANT") || p.includes("JALDI")) {
        setPriority("P1");
      } else if (p.includes("2") || p.includes("4H") || p.includes("4 HR")) {
        setPriority("P2");
      } else if (p.includes("3") || p.includes("8H") || p.includes("8 HR")) {
        setPriority("P3");
      } else if (p.includes("4") || p.includes("24H") || p.includes("24 HR") || p.includes("KAL") || p.includes("TOMORROW")) {
        setPriority("P4");
      } else if (p.includes("5") || p.includes("48H") || p.includes("48 HR") || p.includes("LOW")) {
        setPriority("P5");
      }
    }

    if (data.assigneeName && members.length > 0) {
      const match = members.find(
        (m) =>
          (m.name && m.name.toLowerCase().includes(data.assigneeName!.toLowerCase())) ||
          m.email.toLowerCase().includes(data.assigneeName!.toLowerCase())
      );
      if (match) setAssigneeEmail(match.email);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Calculate deadline automatically based on Priority level
    const calculatedDeadline = new Date();
    switch (priority) {
      case "P1":
        calculatedDeadline.setHours(calculatedDeadline.getHours() + 2); // Urgent
        break;
      case "P2":
        calculatedDeadline.setHours(calculatedDeadline.getHours() + 4); // 4 hrs
        break;
      case "P3":
        calculatedDeadline.setHours(calculatedDeadline.getHours() + 8); // 8 hrs
        break;
      case "P4":
        calculatedDeadline.setHours(calculatedDeadline.getHours() + 24); // 24 hrs
        break;
      case "P5":
        calculatedDeadline.setHours(calculatedDeadline.getHours() + 48); // 48 hrs
        break;
      default:
        calculatedDeadline.setHours(calculatedDeadline.getHours() + 4);
    }

    const payload = {
      title,
      description,
      assigneeEmail,
      priority,
      dueAt: calculatedDeadline.toISOString(),
      estimatedMinutes: 60,
      tags: [],
      completionProofType: "NONE",
      checklist: [],
      status: "ASSIGNED",
      taskStatus: "ASSIGNED",
      approvalRequired: formData.get("approvalRequired") === "on",
      calendarSyncEnabled: formData.get("calendarSyncEnabled") === "on",
      emailEnabled: formData.get("emailEnabled") === "on",
    };

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Task creation failed.");
        return;
      }

      setMessage("Task created successfully.");
      form.reset();
      setTitle("");
      setDescription("");
      setAssigneeEmail("");
      setPriority("P2");
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
        <AiTaskModal onParsed={handleAiParsed} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Task title</label>
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 text-sm"
          placeholder="e.g. Audit Q3 vendor invoices"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
        <textarea
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 text-sm"
          placeholder="Scope, deliverables, and expectations"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Assign To Agent</label>
          <select
            name="assigneeEmail"
            required
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900 bg-white text-sm"
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Priority Level</label>
          <select
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900 bg-white text-sm"
          >
            <option value="P1">P1 (Urgent)</option>
            <option value="P2">P2 (4 hrs)</option>
            <option value="P3">P3 (8 hrs)</option>
            <option value="P4">P4 (24 hrs)</option>
            <option value="P5">P5 (48 hrs)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-700">
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

      <Button type="submit" disabled={loading} className="w-full cursor-pointer">
        {loading ? "Assigning Task..." : "Assign Task"}
      </Button>
    </form>
  );
}