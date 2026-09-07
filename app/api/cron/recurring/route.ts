import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const templates = await prisma.recurringTemplate.findMany({ where: { active: true, OR: [{ lastGeneratedDate: null }, { lastGeneratedDate: { not: today } }] } });
  let generated = 0;
  for (const template of templates) {
    await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({ data: { organizationId: template.organizationId, creatorId: template.creatorId, title: template.title, description: template.description, status: "ASSIGNED", priority: "P3", dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), emailEnabled: false, subtasks: { create: template.subtaskTemplates.map((title) => ({ title })) } } });
      await tx.recurringTemplate.update({ where: { id: template.id }, data: { lastGeneratedDate: today, generatedTaskId: task.id } });
    });
    generated++;
  }
  return NextResponse.json({ generated, date: today });
}
