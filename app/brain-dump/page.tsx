import { AppShell } from "@/components/app-shell";
import { requireOrganizationMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrainDumpEditor } from "@/components/brain-dump-editor";

export default async function BrainDumpPage() {
  const user = await requireOrganizationMembership();
  const notes = await prisma.brainDumpNote.findMany({ where: { organizationId: user.organizationId, userId: user.id }, orderBy: { createdAt: "desc" } });
  return <AppShell title="Brain Dump" subtitle="Capture first. Organize when ready." userRole={user.role ?? "EMPLOYEE"}><BrainDumpEditor initialNotes={notes} /></AppShell>;
}
