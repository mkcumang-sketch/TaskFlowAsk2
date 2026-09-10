import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { InboxView } from "@/components/inbox/inbox-view";

export default async function InboxPage() {
  const user = await requireUser();
  const organizationId = user.organizationId!;

  // 1. Ensure Default Company All-Hands Conversation exists
  let companyChat = await prisma.conversation.findFirst({
    where: {
      organizationId,
      type: "COMPANY_ALL_HANDS",
    },
  });

  if (!companyChat) {
    companyChat = await prisma.conversation.create({
      data: {
        organizationId,
        name: "Company All-Hands",
        type: "COMPANY_ALL_HANDS",
        description: "Company-wide general discussions and announcements",
        creatorId: user.id,
        participants: {
          create: {
            userId: user.id,
            role: "ADMIN",
          },
        },
      },
    });
  }

  // 2. Parallel Database Queries
  const [notifications, conversations, users] = await Promise.all([
    // Active Notifications
    prisma.notification.findMany({
      where: {
        userId: user.id,
        organizationId,
        archived: false,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Group, Department & Project Conversations
    prisma.conversation.findMany({
      where: {
        organizationId,
        type: { not: "DIRECT" },
      },
      include: {
        department: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
    }),

    // Organization Directory with Presence Status
    prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        presenceStatus: true,
        lastSeenAt: true,
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Extract a clean string role for both the AppShell and the Client view
  const userRoleString: string =
    typeof user.role === "string"
      ? user.role
      : (user.role as any)?.name || "EMPLOYEE";

  return (
    <AppShell
      title="Unified Command Center"
      subtitle="Company Groups, Department Teams, 1-on-1 Colleague Directory, and Workflows."
      userRole={userRoleString}
    >
      <InboxView
        initialNotifications={notifications as any}
        initialChannels={conversations as any}
        directoryUsers={users as any}
        currentUserId={user.id}
        currentUserRole={userRoleString}
      />
    </AppShell>
  );
}