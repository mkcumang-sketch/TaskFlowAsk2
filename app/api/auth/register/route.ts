import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { getDemoTaskData } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload." }, { status: 400 });
  }

  const { name, email, password, companyName } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ error: "User already exists." }, { status: 409 });
  }

  const slug = (companyName || `${name.split(" ")[0]} team`).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const organization = await prisma.organization.create({
    data: {
      name: companyName || `${name}'s Company`,
      slug,
    },
  });

  const ownerRole = await prisma.role.upsert({
    where: { name: "OWNER" },
    update: {},
    create: { name: "OWNER" },
  });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      organizationId: organization.id,
      roleId: ownerRole.id,
    },
  });

  await getDemoTaskData(organization.id);

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: organization.id,
    role: "OWNER",
  });

  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: organization.id,
    },
  });

  return setSessionCookie(response, token);
}
