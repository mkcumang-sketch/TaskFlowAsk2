import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ProjectsPage() {
  await requireUser();

  return (
    <AppShell title="Projects" subtitle="Portfolio progress, dependencies, and execution health.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ProjectCard name="Q3 Operations" progress={68} tasks={18} members={7} />
        <ProjectCard name="Vendor Renewal" progress={42} tasks={12} members={5} />
        <ProjectCard name="Client Onboarding" progress={89} tasks={9} members={4} />
      </div>
    </AppShell>
  );
}

function ProjectCard({ name, progress, tasks, members }: { name: string; progress: number; tasks: number; members: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
        <span className="text-sm font-medium text-slate-500">{progress}%</span>
      </div>
      <div className="mt-4 h-2.5 rounded-full bg-slate-100">
        <div className="h-2.5 rounded-full bg-slate-900" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 text-sm text-slate-600">{tasks} tasks • {members} members</div>
    </div>
  );
}
