import { prisma } from "@/lib/prisma";

export async function convertMessageToTask({
  messageId,
  userId,
  organizationId,
  customTitle,
}: {
  messageId: string;
  userId: string;
  organizationId: string;
  customTitle?: string;
}) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });

  if (!message) throw new Error("Message not found");

  const task = await prisma.task.create({
    data: {
      organizationId,
      creatorId: userId,
      title: customTitle || `Task: ${message.content.slice(0, 60)}...`,
      description: `Created from Chat in "${message.conversation?.name || "Direct Message"}"\n\nOriginal Message:\n"${message.content}"`,
      status: "ASSIGNED",
      priority: "MEDIUM",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.message.update({
    where: { id: messageId },
    data: { taskId: task.id },
  });

  return task;
}

export async function convertGmailToTask({
  threadId,
  userId,
  organizationId,
}: {
  threadId: string;
  userId: string;
  organizationId: string;
}) {
  const thread = await prisma.gmailThread.findUnique({
    where: { id: threadId },
  });

  if (!thread) throw new Error("Gmail thread not found");

  const task = await prisma.task.create({
    data: {
      organizationId,
      creatorId: userId,
      title: thread.subject || "Email Task",
      description: `Source: Gmail (${thread.from})\nThread ID: ${thread.threadId}\n\nSnippet:\n${thread.snippet}`,
      status: "ASSIGNED",
      priority: "MEDIUM",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.gmailThread.update({
    where: { id: threadId },
    data: { taskId: task.id },
  });

  return task;
}