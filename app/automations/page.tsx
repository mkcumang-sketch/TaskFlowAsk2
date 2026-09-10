import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AutomationsPage() {
  const user = await requireUser();

  return (
    <AppShell
      title="Workflow Automations"
      subtitle="Configure automated recurring assignments, reminders, and escalations."
      userRole={user.role}
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Active Office Triggers</h2>
          <p className="mb-4 text-sm text-slate-500">
            Background jobs running via internal cron engine.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Daily Morning Assignment Digest
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Active
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Fires at 09:00 AM IST to notify employees of today&apos;s pending workload.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Proof Escalation on Overdue
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Active
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Alerts the assigning manager if a high-priority task passes deadline without submission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}