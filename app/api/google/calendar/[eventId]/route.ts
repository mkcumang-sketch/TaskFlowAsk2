import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getGoogleCalendarClientForUser } from "@/lib/google";
import { prisma } from "@/lib/prisma";

const calendarUpdateSchema = z.object({
  summary: z.string().min(1).optional(),
  description: z.string().optional(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
  calendarId: z.string().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getSession();
  const { eventId } = await params;

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = calendarUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid update payload" }, { status: 400 });
  }

  const existingEvent = await prisma.calendarEvent.findUnique({
    where: { taskId: eventId },
    include: { task: true },
  });

  if (!existingEvent || !existingEvent.googleEventId) {
    return NextResponse.json({ error: "Calendar event not found for this task." }, { status: 404 });
  }

  if (existingEvent.task.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const calendar = await getGoogleCalendarClientForUser(session.id);
    const response = await calendar.events.update({
      calendarId: parsed.data.calendarId ?? "primary",
      eventId: existingEvent.googleEventId,
      requestBody: {
        summary: parsed.data.summary ?? existingEvent.task.title,
        description: parsed.data.description ?? existingEvent.task.description ?? undefined,
        start: parsed.data.start ? { dateTime: new Date(parsed.data.start).toISOString() } : undefined,
        end: parsed.data.end ? { dateTime: new Date(parsed.data.end).toISOString() } : undefined,
      },
    });

    await prisma.calendarEvent.update({
      where: { taskId: eventId },
      data: {
        status: "SYNCED",
        lastSyncedAt: new Date(),
        syncError: null,
      },
    });

    return NextResponse.json({ success: true, event: response.data });
  } catch (error) {
    await prisma.calendarEvent.update({
      where: { taskId: eventId },
      data: {
        status: "ERROR",
        syncError: error instanceof Error ? error.message : "Unable to update calendar event.",
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update calendar event." },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await getSession();
  const { eventId } = await params;

  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingEvent = await prisma.calendarEvent.findUnique({
    where: { taskId: eventId },
    include: { task: true },
  });

  if (!existingEvent || !existingEvent.googleEventId) {
    return NextResponse.json({ error: "Calendar event not found for this task." }, { status: 404 });
  }

  if (existingEvent.task.organizationId !== session.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const calendar = await getGoogleCalendarClientForUser(session.id);
    await calendar.events.delete({
      calendarId: "primary",
      eventId: existingEvent.googleEventId,
    });

    await prisma.calendarEvent.delete({ where: { taskId: eventId } });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete calendar event." },
      { status: 502 },
    );
  }
}
