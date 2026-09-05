"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SubtaskList({ taskId, initialSubtasks }: { taskId: string; initialSubtasks: any[] }) {
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [newTitle, setNewTitle] = useState("");
  const router = useRouter();

  const toggleSubtask = async (id: string, completed: boolean) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, completed } : s)));
    await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed }),
    });
    router.refresh();
  };

  const addSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });

    if (res.ok) {
      const created = await res.json();
      setSubtasks((prev) => [...prev, created]);
      setNewTitle("");
      router.refresh();
    }
  };

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Subtasks</h3>
        <span className="text-xs text-slate-400">
          {subtasks.filter((s) => s.completed).length}/{subtasks.length} done
        </span>
      </div>

      <div className="space-y-2">
        {subtasks.map((st) => (
          <label key={st.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={st.completed}
              onChange={(e) => toggleSubtask(st.id, e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span className={st.completed ? "line-through text-slate-400" : ""}>{st.title}</span>
          </label>
        ))}
      </div>

      <form onSubmit={addSubtask} className="mt-3 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add subtask..."
          className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-slate-800"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Add
        </button>
      </form>
    </div>
  );
}

export function CommentBox({ taskId, initialComments }: { taskId: string; initialComments: any[] }) {
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newC = await res.json();
        setComments((prev) => [newC, ...prev]);
        setContent("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Activity & Comments</h3>

      <form onSubmit={handleSend} className="mb-4 space-y-2">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Leave an update or comment..."
          className="w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-slate-800"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post Comment"}
        </button>
      </form>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            No discussion yet.
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-2xl bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-semibold text-slate-900">{c.author?.name || "Member"}</span>
                <span className="text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-700">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}