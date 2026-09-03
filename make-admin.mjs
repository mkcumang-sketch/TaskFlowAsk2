import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function run() {
  const email = "admin@ask2global.com";
  const rawPassword = "admin@2390";
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // 1. Organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Ask2Global Workspace",
        slug: "ask2global",
      },
    });
  }

  // 2. Role
  let role = await prisma.role.findFirst({
    where: { name: { in: ["SUPER_ADMIN", "ADMIN", "OWNER"] } },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: "SUPER_ADMIN",
      },
    });
  }

  // 3. User upsert
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      organizationId: org.id,
      roleId: role.id,
    },
    create: {
      email,
      name: "Super Admin",
      passwordHash,
      organizationId: org.id,
      roleId: role.id,
    },
  });

  console.log("SUCCESS: Admin created ->", user.email);
}

run()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());