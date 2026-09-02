import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function TeamPage() {
  await requireUser();

  return (
    <AppShell title="Team" subtitle="Workload visibility, role coverage, and team accountability.">
      <div className="grid gap-4 md:grid-cols-3">
        <TeamCard name="Rahul" workload="112%" status="Overloaded" />
        <TeamCard name="Aisha" workload="89%" status="Balanced" />
        <TeamCard name="Mehul" workload="76%" status="Available" />
      </div>
    </AppShell>
  );
}

function TeamCard({ name, workload, status }: { name: string; workload: string; status: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{status}</span>
      </div>
      <div className="mt-4 text-3xl font-bold text-slate-900">{workload}</div>
      <div className="mt-2 text-sm text-slate-500">Assigned hours vs. capacity</div>
    </div>
  );
}
