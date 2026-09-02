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
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role: user.role?.name ?? null,
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
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
