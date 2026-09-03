import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  organizationId: string | null;
  role: string | null;
};

const SESSION_COOKIE = "taskflow-session";
const JWT_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || "dev-secret";

const PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  OWNER: ["*"],
  ADMIN: ["manage_users", "manage_organization", "view_reports", "manage_integrations", "manage_automation", "approve_task", "assign_task", "create_task", "edit_task"],
  DEPARTMENT_HEAD: ["manage_department", "approve_task", "assign_task", "create_task", "edit_task", "view_reports"],
  MANAGER: ["assign_task", "create_task", "edit_task", "approve_task", "view_reports"],
  TEAM_LEADER: ["assign_task", "create_task", "edit_task", "view_reports"],
  EMPLOYEE: ["view_tasks", "accept_task", "start_task", "submit_task", "comment_task"],
  GUEST: ["view_tasks"],
};

export async function createSessionToken(user: SessionUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    const normalizedRoleName = user.role?.name ?? payload.role ?? null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: normalizedRoleName,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export function hasPermission(role: string | null | undefined, permission: string) {
  if (!role) return false;

  const rolePermissions = PERMISSIONS_BY_ROLE[role] ?? [];
  return rolePermissions.includes("*") || rolePermissions.includes(permission);
}

export async function requireUser() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireOrganizationMembership() {
  const user = await requireUser();

  if (!user.organizationId) {
    throw new Error("Organization is required to access this feature.");
  }

  return user;
}

export async function requirePermission(permission: string) {
  const user = await requireOrganizationMembership();

  if (!hasPermission(user.role, permission)) {
    throw new Error("Forbidden");
  }

  return user;
}

export async function setSessionCookie(response: Response, token: string) {
  const cookieHeader = `taskflow-session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
  response.headers.set("Set-Cookie", cookieHeader);
  return response;
}

export async function clearSessionCookie(response: Response) {
  const cookieHeader = "taskflow-session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  response.headers.set("Set-Cookie", cookieHeader);
  return response;
}
