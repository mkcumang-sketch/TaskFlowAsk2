import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ProjectsPage() {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();

  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId! },
    include: {
      tasks: { select: { id: true, status: true } },
      members: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      title="Projects"
      subtitle="Portfolio progress, dependencies, and execution health."
      userRole={normalizedRole}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            No projects found. Create a project from tasks or assignments.
          </div>
        ) : (
          projects.map((p) => {
            const completed = p.tasks.filter((t) => t.status === "COMPLETED").length;
            const progress = p.tasks.length ? Math.round((completed / p.tasks.length) * 100) : 0;
            return (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                    {progress}%
                  </span>
                </div>
                {p.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>{p.tasks.length} tasks</span>
                  <span>•</span>
                  <span>{p.members.length} members</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}