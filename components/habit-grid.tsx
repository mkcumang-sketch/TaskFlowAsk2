"use client";

import { useState } from "react";

type Habit = { id: string; name: string; frequencyDays: number[]; logs: { date: string; completed: boolean }[] };
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function dateFor(day: number) { const date = new Date(); const monday = new Date(date); const offset = (date.getDay() + 6) % 7; monday.setDate(date.getDate() - offset + day); return monday.toISOString().slice(0, 10); }

export function HabitGrid({ habits: initial }: { habits: Habit[] }) {
  const [habits, setHabits] = useState(initial);
  async function toggle(habit: Habit, date: string) {
    const completed = !habit.logs.some((log) => log.date === date && log.completed);
    await fetch(`/api/habits/${habit.id}/log`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, completed }) });
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, logs: [...item.logs.filter((log) => log.date !== date), { date, completed }] } : item));
  }
  return <div className="space-y-4"><div className="grid grid-cols-8 gap-2 text-xs font-bold text-slate-500"><span>Habit</span>{days.map((day) => <span key={day} className="text-center">{day}</span>)}</div>{habits.map((habit) => <div key={habit.id} className="grid grid-cols-8 items-center gap-2 rounded-2xl border bg-white p-3 text-sm"><span className="font-semibold">{habit.name}</span>{days.map((_, index) => { const date = dateFor(index); const done = habit.logs.some((log) => log.date === date && log.completed); return <button key={date} onClick={() => toggle(habit, date)} className={`mx-auto h-7 w-7 rounded-lg text-xs ${done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>{done ? "✓" : "·"}</button>; })}</div>)}<NewHabit onCreated={(habit) => setHabits((current) => [...current, habit])} /></div>;
}

function NewHabit({ onCreated }: { onCreated: (habit: Habit) => void }) {
  const [name, setName] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!name.trim()) return; const response = await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); if (response.ok) { onCreated({ ...(await response.json()), logs: [] }); setName(""); } }
  return <form onSubmit={submit} className="flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add a habit..." className="flex-1 rounded-xl border px-3 py-2 text-sm" /><button className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">Add</button></form>;
}
