import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NotificationsPage() {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell
      title="Notifications"
      subtitle="All workspace alerts, mentions, reminders, and escalation logs."
      userRole={normalizedRole}
    >
      <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
            You are completely caught up! No notifications right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {n.type || "INFO"}
                    </span>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{n.content}</p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                {n.link && (
                  <Link
                    href={n.link}
                    className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}