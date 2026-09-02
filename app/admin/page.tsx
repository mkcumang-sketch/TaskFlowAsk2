import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AdminPage() {
  await requireUser();

  return (
    <AppShell title="Admin" subtitle="Platform health, failed jobs, integrations, and security posture.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard label="Database" value="Healthy" />
        <AdminCard label="Email" value="Configured" />
        <AdminCard label="Google API" value="Pending" />
        <AdminCard label="Queue" value="Operational" />
      </div>
    </AppShell>
  );
}

function AdminCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
