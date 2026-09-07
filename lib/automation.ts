import { prisma } from "@/lib/prisma";

export type AutomationContext = { organizationId: string; taskId?: string; event: string };

export async function evaluateAutomationRules(context: AutomationContext) {
  const rules = await prisma.automation.findMany({ where: { organizationId: context.organizationId, enabled: true, whenTrigger: context.event } });
  for (const rule of rules) {
    const conditionMet = !rule.condition || rule.condition === "*" || (context.taskId ? rule.condition.includes(context.taskId) : true);
    if (!conditionMet) continue;
    if (rule.action.startsWith("NOTIFY:")) {
      const content = rule.action.slice("NOTIFY:".length).trim() || rule.name;
      const users = await prisma.user.findMany({ where: { organizationId: context.organizationId }, select: { id: true } });
      await prisma.notification.createMany({ data: users.map((user) => ({ userId: user.id, organizationId: context.organizationId, taskId: context.taskId, type: "AUTOMATION", content })) });
    }
  }
}
