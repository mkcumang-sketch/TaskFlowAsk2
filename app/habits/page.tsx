import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HabitGrid } from "@/components/habit-grid";

export default async function HabitsPage() {
  const user = await requireOrganizationMembership();
  const habits = await prisma.habit.findMany({ where: { organizationId: user.organizationId, userId: user.id, active: true }, include: { logs: true }, orderBy: { createdAt: "asc" } });
  return <AppShell title="Habits" subtitle="Build consistent daily routines." userRole={user.role ?? "EMPLOYEE"}><HabitGrid habits={habits} /></AppShell>;
}
