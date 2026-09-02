import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ReportsPage() {
  await requireUser();

  return (
    <AppShell title="Reports" subtitle="Operational metrics, overdue analysis, and completion trends.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard label="On-time rate" value="91%" />
        <ReportCard label="Approval rate" value="86%" />
        <ReportCard label="Average cycle time" value="3.4d" />
        <ReportCard label="At-risk tasks" value="12" />
      </div>
    </AppShell>
  );
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
