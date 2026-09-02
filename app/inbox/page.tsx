import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function InboxPage() {
  await requireUser();

  return (
    <AppShell title="Inbox" subtitle="Messages, comments, and review updates for your team.">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-500">No new messages.</div>
      </div>
    </AppShell>
  );
}
