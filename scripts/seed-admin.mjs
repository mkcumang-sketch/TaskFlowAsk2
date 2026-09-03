import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running the admin seed.");
  }
  const organization = await prisma.organization.upsert({
    where: { slug: "ask2global" },
    update: {},
    create: { name: "Ask2Global", slug: "ask2global" },
  });

  // Keep both names available; a user can have one relational role at a time.
  const ownerRole = await prisma.role.upsert({
    where: { name: "OWNER" },
    update: {},
    create: { name: "OWNER" },
  });
  await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      organizationId: organization.id,
      roleId: ownerRole.id,
    },
    create: {
      name: "System Admin",
      email,
      passwordHash,
      organizationId: organization.id,
      roleId: ownerRole.id,
    },
    include: { role: true },
  });

  console.log(`Configured ${user.email} with role ${user.role?.name}.`);
}

main()
  .catch((error) => {
    console.error("Admin seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
