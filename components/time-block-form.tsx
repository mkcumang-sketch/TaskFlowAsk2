"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TimeBlockForm() {
  const router = useRouter();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState("TASK");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/time-blocks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startTime, endTime, type }) });
    if (response.ok) { setStartTime(""); setEndTime(""); router.refresh(); } else alert((await response.json()).error || "Unable to add block");
  }
  return <form onSubmit={submit} className="mb-5 flex flex-wrap gap-2 rounded-2xl border bg-white p-3"><input required type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="rounded-lg border px-2 py-1 text-xs" /><input required type="datetime-local" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="rounded-lg border px-2 py-1 text-xs" /><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border px-2 py-1 text-xs"><option>TASK</option><option>BREAK</option><option>LUNCH</option><option>MEETING</option></select><button className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Add block</button></form>;
}
