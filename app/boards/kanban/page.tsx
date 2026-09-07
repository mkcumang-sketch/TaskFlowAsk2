import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const columns = ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "REVIEW", "APPROVED"];
export default async function BoardKanbanPage() {
  const user = await requireOrganizationMembership();
  const tasks = await prisma.task.findMany({ where: { organizationId: user.organizationId }, orderBy: { updatedAt: "desc" }, take: 200 });
  return <AppShell title="Kanban Board" subtitle="Execution flow by lifecycle column." userRole={user.role ?? "EMPLOYEE"}><div className="grid gap-3 overflow-x-auto md:grid-cols-5">{columns.map((column) => <section key={column} className="min-w-52 rounded-2xl bg-slate-100 p-3"><div className="mb-2 flex justify-between text-xs font-bold"><span>{column}</span><span>{tasks.filter((task) => task.status === column).length}</span></div><div className="space-y-2">{tasks.filter((task) => task.status === column).map((task) => <Link href={`/tasks/${task.id}`} key={task.id} className="block rounded-xl bg-white p-3 text-sm shadow-sm">{task.title}<span className="mt-1 block text-[10px] text-slate-400">{task.priority}</span></Link>)}</div></section>)}</div></AppShell>;
}
