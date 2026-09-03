import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await getSession();

  // Sirf Boss/Admin allowed hai
  if (!session || !session.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email aur password required hain." }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json({ error: "Is email se user pehle se exist karta hai." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Default MEMBER role dhundo ya create karo
  let memberRole = await prisma.role.findFirst({
    where: { name: "MEMBER" },
  });

  if (!memberRole) {
    memberRole = await prisma.role.create({
      data: { name: "MEMBER" },
    });
  }

  const newAgent = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      organizationId: session.organizationId,
      roleId: memberRole.id,
    },
  });

  return NextResponse.json({
    success: true,
    agent: {
      id: newAgent.id,
      name: newAgent.name,
      email: newAgent.email,
    },
  });
}