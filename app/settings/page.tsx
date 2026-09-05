import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();

  return (
    <AppShell
      title="Settings"
      subtitle="Workflow defaults, notification rules, and integrations."
      userRole={normalizedRole}
    >
      <div className="space-y-6 max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Profile Information</h2>
          <div className="mt-4 space-y-3 text-xs text-slate-600">
            <p><strong className="text-slate-900">Name:</strong> {user.name || "User"}</p>
            <p><strong className="text-slate-900">Email:</strong> {user.email}</p>
            <p><strong className="text-slate-900">Role:</strong> {normalizedRole}</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}