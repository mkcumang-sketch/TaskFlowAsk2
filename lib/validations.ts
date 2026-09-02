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

export const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  dueAt: z.string().optional().or(z.date().optional()),
  assigneeEmail: z.string().email().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  taskStatus: z.enum([
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
  ]).default("ASSIGNED"),
  calendarSyncEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
});
