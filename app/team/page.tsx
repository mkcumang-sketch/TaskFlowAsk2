import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { TeamDirectoryClient } from "@/components/team/team-directory-client";

export default async function TeamPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  const [members, departments] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId },
      include: {
        role: { select: { name: true } },
        department: { select: { id: true, name: true } },
        taskAssignments: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const userRoleString: string =
    typeof user.role === "string"
      ? user.role
      : (user.role as any)?.name || "EMPLOYEE";

  return (
    <AppShell
      title="Team & Agents"
      subtitle="Manage workspace members, generate assignment handles, and organize departments."
      userRole={userRoleString}
    >
      <TeamDirectoryClient
        initialMembers={JSON.parse(JSON.stringify(members))}
        departments={JSON.parse(JSON.stringify(departments))}
        currentUserId={user.id}
        currentUserRole={userRoleString}
      />
    </AppShell>
  );
}