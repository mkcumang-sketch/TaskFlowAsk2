import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  companyName: z.string().min(2, "Company name is required").optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const taskStatusValues = [
  "DRAFT",
  "ASSIGNED",
  "SEEN",
  "ACCEPTED",
  "IN_PROGRESS",
  "WAITING",
  "BLOCKED",
  "REVIEW",
  "COMPLETED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "OVERDUE",
  "ON_HOLD",
  "NEEDS_CLARIFICATION",
] as const;

export const taskPriorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const recurrenceValues = ["NONE", "DAILY", "WEEKDAYS", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"] as const;

export const proofTypeValues = ["NONE", "TEXT", "IMAGE", "PDF", "EXCEL", "CSV", "DOC", "LINK", "CHECKLIST", "MULTI_FILE"] as const;

export const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  dueAt: z.string().optional().or(z.date().optional()),
  startAt: z.string().optional().or(z.date().optional()),
  assigneeEmail: z.string().email().optional().or(z.literal("")),
  assigneeEmails: z.array(z.string().email()).optional().default([]),
  departmentId: z.string().optional(),
  teamId: z.string().optional(),
  projectId: z.string().optional(),
  priority: z.enum(taskPriorityValues).default("MEDIUM"),
  status: z.enum(taskStatusValues).default("ASSIGNED"),
  taskStatus: z.enum(taskStatusValues).default("ASSIGNED").optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  tags: z.array(z.string().min(1)).optional().default([]),
  checklist: z.array(z.object({ text: z.string().min(1) })).optional().default([]),
  subtasks: z.array(z.object({ title: z.string().min(1), description: z.string().optional() })).optional().default([]),
  dependencies: z.array(z.string()).optional().default([]),
  recurrence: z.enum(recurrenceValues).optional().default("NONE"),
  completionProofType: z.enum(proofTypeValues).optional().default("NONE"),
  approvalRequired: z.boolean().optional().default(false),
  calendarSyncEnabled: z.boolean().optional().default(false),
  emailEnabled: z.boolean().optional().default(true),
});
