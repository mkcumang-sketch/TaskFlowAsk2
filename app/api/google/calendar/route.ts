import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hasPermission } from "@/lib/auth";
import { getGoogleCalendarClientForUser } from "@/lib/google";
import { prisma } from "@/lib/prisma";

const calendarEventSchema = z.object({
  taskId: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  calendarId: z.string().optional(),
  attendees: z.array(z.string().email()).optional().default([]),
});

export async function GET() {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const calendar = await getGoogleCalendarClientForUser(session.id);
    const response = await calendar.calendarList.list();

    return NextResponse.json({
      calendars: (response.data.items ?? []).map((item) => ({
        id: item.id,
        summary: item.summary,
        primary: item.primary ?? false,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load calendars." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = calendarEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid calendar payload" }, { status: 400 });
  }

  const { taskId, summary, description, start, end, calendarId, attendees } = parsed.data;

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: session.organizationId,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  if (task.creatorId !== session.id && !hasPermission(session.role, "edit_task")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingEvent = await prisma.calendarEvent.findUnique({
    where: { taskId },
  });

  if (existingEvent?.googleEventId) {
    return NextResponse.json({
      success: true,
      eventId: existingEvent.googleEventId,
      duplicate: true,
      message: "Calendar event already exists for this task.",
    });
  }

  try {
    const calendar = await getGoogleCalendarClientForUser(session.id);
    const googleEvent = await calendar.events.insert({
      calendarId: calendarId ?? "primary",
      requestBody: {
        summary,
        description,
        start: { dateTime: new Date(start).toISOString() },
        end: { dateTime: new Date(end).toISOString() },
        attendees: attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: { requestId: `taskflow-${taskId}` },
        },
      },
      conferenceDataVersion: 1,
    });

    const calendarEvent = await prisma.calendarEvent.upsert({
      where: { taskId },
      update: {
        googleEventId: googleEvent.data.id ?? null,
        status: "SYNCED",
        lastSyncedAt: new Date(),
        syncError: null,
      },
      create: {
        taskId,
        googleEventId: googleEvent.data.id ?? null,
        status: "SYNCED",
        lastSyncedAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.id,
        taskId,
        action: "CALENDAR_EVENT_CREATED",
        details: `Google Calendar event created: ${googleEvent.data.id ?? "unknown"}`,
      },
    });

    return NextResponse.json({ success: true, calendarEvent, googleEventId: googleEvent.data.id });
  } catch (error) {
    await prisma.calendarEvent.upsert({
      where: { taskId },
      update: {
        status: "ERROR",
        syncError: error instanceof Error ? error.message : "Unable to sync calendar event.",
        lastSyncedAt: new Date(),
      },
      create: {
        taskId,
        status: "ERROR",
        syncError: error instanceof Error ? error.message : "Unable to sync calendar event.",
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync calendar event." },
      { status: 502 },
    );
  }
}
