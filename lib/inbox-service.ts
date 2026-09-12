import { prisma } from "@/lib/prisma";
import { NotificationCategory, NotificationPriority, Prisma } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  organizationId?: string | null;
  actorId?: string | null;
  taskId?: string | null;
  title?: string | null;
  content: string;
  type?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  link?: string | null;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    organizationId,
    actorId,
    taskId,
    title,
    content,
    type = "GENERAL",
    category = "ALL",
    priority = "MEDIUM",
    link,
    actionUrl,
    entityType,
    entityId,
    metadata,
  } = params;

  return await prisma.notification.create({
    data: {
      userId,
      organizationId: organizationId || undefined,
      actorId: actorId || null,
      taskId: taskId || null,
      title: title || null,
      content,
      type,
      category,
      priority,
      link: link || actionUrl || null,
      entityType: entityType || null,
      entityId: entityId || null,
      metadata: metadata !== undefined ? metadata : undefined,
    },
  });
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      read: true,
    },
  });
}

export async function markAllNotificationsAsRead(userId: string, organizationId?: string) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    read: false,
  };

  if (organizationId) {
    where.organizationId = organizationId;
  }

  return await prisma.notification.updateMany({
    where,
    data: {
      read: true,
    },
  });
}