import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EisenhowerPage() {
  const user = await requireOrganizationMembership();
  const tasks = await prisma.task.findMany({ where: { organizationId: user.organizationId, status: { notIn: ["COMPLETED", "APPROVED"] } }, orderBy: { dueAt: "asc" } });
  const groups = [
    ["Q1 · Urgent & Important", tasks.filter((task) => ["P1", "P2"].includes(task.priority))],
    ["Q2 · Not Urgent, Important", tasks.filter((task) => task.priority === "P3")],
    ["Q3 · Urgent, Not Important", tasks.filter((task) => task.priority === "P4")],
    ["Q4 · Eliminate / backlog", tasks.filter((task) => task.priority === "P5")],
  ] as const;
  return <AppShell title="Eisenhower Matrix" subtitle="Prioritize work by urgency and importance." userRole={user.role ?? "EMPLOYEE"}><div className="grid gap-4 md:grid-cols-2">{groups.map(([title, group]) => <section key={title} className="rounded-2xl border bg-white p-4"><h2 className="font-bold">{title} <span className="text-xs text-slate-400">({group.length})</span></h2><div className="mt-3 space-y-2">{group.map((task) => <Link href={`/tasks/${task.id}`} key={task.id} className="block rounded-xl bg-slate-50 p-3 text-sm">{task.title}</Link>)}</div></section>)}</div></AppShell>;
}
