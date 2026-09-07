import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TimeBlockForm } from "@/components/time-block-form";

export default async function SchedulePage() {
  const user = await requireOrganizationMembership();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const blocks = await prisma.timeBlock.findMany({ where: { userId: user.id, startTime: { gte: start, lt: end } }, include: { task: true }, orderBy: { startTime: "asc" } });
  return <AppShell title="Schedule" subtitle="Timebox your day with task, break, lunch, and meeting blocks." userRole={user.role ?? "EMPLOYEE"}>
    <TimeBlockForm /><div className="space-y-1">{Array.from({ length: 24 }, (_, hour) => { const hourBlocks = blocks.filter((block) => block.startTime.getHours() === hour); return <div key={hour} className="grid min-h-16 grid-cols-[4rem_1fr] border-b border-slate-100"><span className="pt-2 text-xs text-slate-400">{String(hour).padStart(2, "0")}:00</span><div className="space-y-1 p-1">{hourBlocks.map((block) => <div key={block.id} className="rounded-lg bg-blue-50 p-2 text-xs text-blue-800">{block.type}: {block.title || block.task?.title || "Block"} ({block.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{block.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</div>)}</div></div>; })}</div>
  </AppShell>;
}
