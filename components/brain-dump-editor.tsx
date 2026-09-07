"use client";

import { useState } from "react";

type Note = { id: string; content: string; isConverted: boolean };
export function BrainDumpEditor({ initialNotes }: { initialNotes: Note[] }) {
  const [content, setContent] = useState(""); const [notes, setNotes] = useState(initialNotes);
  async function save() { if (!content.trim()) return; const response = await fetch("/api/brain-dump", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) }); if (response.ok) { setNotes([await response.json(), ...notes]); setContent(""); } }
  async function convert(id: string) { const response = await fetch(`/api/brain-dump/${id}/convert`, { method: "POST" }); if (response.ok) setNotes(notes.map((note) => note.id === id ? { ...note, isConverted: true } : note)); }
  return <div className="space-y-5"><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write anything..." rows={6} className="w-full rounded-2xl border bg-white p-4 font-mono text-sm shadow-sm" /><button onClick={save} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Save note</button><div className="space-y-3">{notes.map((note) => <article key={note.id} className="rounded-2xl border bg-white p-4"><p className="whitespace-pre-wrap text-sm">{note.content}</p><div className="mt-3 flex gap-2">{!note.isConverted && <button onClick={() => convert(note.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">Convert to Task</button>}<span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-500">{note.isConverted ? "Converted" : "Note"}</span></div></article>)}</div></div>;
}
