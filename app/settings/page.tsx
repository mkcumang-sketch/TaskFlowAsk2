import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  await requireUser();

  return (
    <AppShell title="Settings" subtitle="Timezone, workflow defaults, notification rules, and integrations.">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4 text-sm text-slate-700">
          <p>• Organization timezone: UTC</p>
          <p>• Daily digest: On</p>
          <p>• Google Calendar: Connected or pending based on env setup</p>
          <p>• Default reminders: 9am, 3pm, 5pm, 6pm</p>
        </div>
      </div>
    </AppShell>
  );
}
