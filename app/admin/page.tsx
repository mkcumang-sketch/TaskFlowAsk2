import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();

  if (normalizedRole !== "SUPER_ADMIN" && normalizedRole !== "ADMIN" && normalizedRole !== "OWNER") {
    redirect("/dashboard");
  }

  const [userCount, taskCount, orgCount] = await Promise.all([
    prisma.user.count({ where: { organizationId: user.organizationId! } }),
    prisma.task.count({ where: { organizationId: user.organizationId! } }),
    prisma.organization.count(),
  ]);

  return (
    <AppShell
      title="Admin Control"
      subtitle="System health, failed jobs, integrations, and security posture."
      userRole={normalizedRole}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-slate-100 p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase">Users</span>
          <p className="mt-2 text-3xl font-bold text-slate-900">{userCount}</p>
        </div>
        <div className="rounded-3xl bg-blue-50 p-5">
          <span className="text-xs font-semibold text-blue-600 uppercase">Total Tasks</span>
          <p className="mt-2 text-3xl font-bold text-blue-900">{taskCount}</p>
        </div>
        <div className="rounded-3xl bg-emerald-50 p-5">
          <span className="text-xs font-semibold text-emerald-600 uppercase">Organizations</span>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{orgCount}</p>
        </div>
      </div>
    </AppShell>
  );
}