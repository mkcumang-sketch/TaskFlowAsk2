import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getNotificationsForUser } from "@/lib/data";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await getNotificationsForUser(user.id);

  return (
    <AppShell title="Notifications" subtitle="Task alerts, approvals, and system updates.">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">No notifications yet.</div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <div>
                  <div className="font-medium text-slate-900">{notification.type}</div>
                  <div className="text-sm text-slate-600">{notification.content}</div>
                </div>
                <span className="text-xs text-slate-500">{notification.read ? "Read" : "Unread"}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
