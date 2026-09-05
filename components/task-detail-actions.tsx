"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: Date | string;
  author: {
    name: string | null;
  } | null;
}

export function TaskSubtasksSection({
  taskId,
  initialSubtasks,
}: {
  taskId: string;
  initialSubtasks: Subtask[];
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggleSubtask = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setSubtasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: nextStatus } : item))
    );

    await fetch(`/api/tasks/${taskId}/subtasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, completed: nextStatus }),
    });
    router.refresh();
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;

  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Subtasks</h3>
        <span className="text-xs text-slate-500">
          {completedCount} of {subtasks.length} completed
        </span>
      </div>

      <div className="space-y-2">
        {subtasks.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-2.5 hover:bg-slate-50 transition"
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => toggleSubtask(item.id, item.completed)}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span
              className={`text-xs ${
                item.completed ? "text-slate-400 line-through" : "text-slate-800"
              }`}
            >
              {item.title}
            </span>
          </label>
        ))}
      </div>

      <form onSubmit={handleAddSubtask} className="mt-3 flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a step or subtask..."
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={loading || !newTitle.trim()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
        >
          {loading ? "..." : "Add"}
        </button>
      </form>
    </div>
  );
}

export function TaskCommentsSection({
  taskId,
  initialComments,
}: {
  taskId: string;
  initialComments: CommentItem[];
}) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const router = useRouter();

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setContent("");
        router.refresh();
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      <div className="mb-3 text-sm font-semibold text-slate-900">Discussion & Updates</div>

      <form onSubmit={handlePostComment} className="mb-4 space-y-2">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an update or note..."
          className="w-full rounded-2xl border border-slate-200 p-3 text-xs outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={posting || !content.trim()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
        >
          {posting ? "Posting..." : "Post Comment"}
        </button>
      </form>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">
                  {comment.author?.name || "Team Member"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}