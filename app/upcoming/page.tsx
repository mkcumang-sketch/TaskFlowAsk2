import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UpcomingPage() {
  const user = await requireOrganizationMembership();
  const [tasks, templates] = await Promise.all([
    prisma.task.findMany({ where: { organizationId: user.organizationId, dueAt: { gte: new Date() }, status: { notIn: ["COMPLETED", "APPROVED"] } }, orderBy: { dueAt: "asc" }, take: 100 }),
    prisma.recurringTemplate.findMany({ where: { organizationId: user.organizationId, active: true }, orderBy: { title: "asc" } }),
  ]);
  return <AppShell title="Upcoming" subtitle="Deadlines and recurring work on the horizon." userRole={user.role ?? "EMPLOYEE"}><div className="space-y-2">{tasks.map((task) => <Link href={`/tasks/${task.id}`} key={task.id} className="flex justify-between rounded-xl border bg-white p-4 text-sm"><span>{task.title}</span><span className="text-xs text-slate-500">{task.dueAt?.toLocaleString()}</span></Link>)}{templates.map((template) => <div key={template.id} className="flex justify-between rounded-xl border border-dashed p-4 text-sm"><span>{template.title}</span><span className="text-xs text-slate-500">Recurring · {template.frequency}</span></div>)}</div></AppShell>;
}
