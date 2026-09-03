import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getGoogleOAuthClient } from "@/lib/google";

export async function syncTaskToGoogleCalendar({
  taskId,
  userId,
}: {
  taskId: string;
  userId: string;
}) {
  const oauthAccount = await prisma.oAuthAccount.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!oauthAccount?.accessToken) {
    return { success: false, reason: "NO_GOOGLE_INTEGRATION" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      creator: { select: { name: true, email: true } },
    },
  });

  if (!task || !task.calendarSyncEnabled) {
    return { success: false, reason: "CALENDAR_SYNC_DISABLED" };
  }

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    access_token: oauthAccount.accessToken,
    refresh_token: oauthAccount.refreshToken ?? undefined,
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      taskId,
    },
  });

  const startTime = task.startAt ? new Date(task.startAt) : new Date();
  const endTime = task.dueAt
    ? new Date(task.dueAt)
    : new Date(startTime.getTime() + (task.estimatedMinutes || 60) * 60 * 1000);

  const eventPayload = {
    summary: `[TaskFlow] ${task.title}`,
    description: `${task.description || "No description provided."}\n\nPriority: ${task.priority}\nStatus: ${task.status}\nAssigned by: ${task.creator?.name || "Team Lead"}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: "UTC",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 60 },
      ],
    },
  };

  try {
    if (existingEvent?.googleEventId) {
      if (task.status === "CANCELLED") {
        await calendar.events.delete({
          calendarId: "primary",
          eventId: existingEvent.googleEventId,
        });

        await prisma.calendarEvent.delete({
          where: { id: existingEvent.id },
        });

        return { success: true, action: "DELETED" };
      }

      const updated = await calendar.events.patch({
        calendarId: "primary",
        eventId: existingEvent.googleEventId,
        requestBody: eventPayload,
      });

      await prisma.calendarEvent.update({
        where: { id: existingEvent.id },
        data: {
          status: "SYNCED",
        },
      });

      return { success: true, action: "UPDATED", eventId: updated.data.id };
    }

    if (task.status !== "CANCELLED") {
      const created = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventPayload,
      });

      if (created.data.id) {
        await prisma.calendarEvent.create({
          data: {
            googleEventId: created.data.id,
            status: "SYNCED",
            taskId: task.id,
          },
        });
      }

      return { success: true, action: "CREATED", eventId: created.data.id };
    }

    return { success: true, action: "NOOP" };
  } catch (error) {
    console.error("Google Calendar Sync failed:", error);
    return { success: false, error: String(error) };
  }
}