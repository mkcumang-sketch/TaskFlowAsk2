import { prisma } from "@/lib/prisma";
import { NotificationCategory, NotificationPriority } from "@prisma/client";

interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  actorId?: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  content: string;
  actionUrl?: string;
  entityType?: "TASK" | "CHAT" | "GMAIL" | "PROJECT";
  entityId?: string;
  metadata?: any;
}

export async function dispatchNotification(params: CreateNotificationParams) {
  // 1. Smart Deduplication: Prevent duplicate notifications in a short timeframe
  const recentDuplicate = await prisma.notification.findFirst({
    where: {
      userId: params.userId,
      entityId: params.entityId,
      category: params.category,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // within last 5 minutes
    },
  });

  if (recentDuplicate) {
    return recentDuplicate;
  }

  return prisma.notification.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      actorId: params.actorId,
      category: params.category,
      priority: params.priority || NotificationPriority.MEDIUM,
      title: params.title,
      content: params.content,
      actionUrl: params.actionUrl,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata || {},
    },
  });
}