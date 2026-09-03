import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@ask2global.com";
  const password = "Admin@2390";
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Organization create ya find karo
  let org = await prisma.organization.findFirst({
    where: { slug: "ask2global" }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Ask2Global Workspace",
        slug: "ask2global",
        timezone: "Asia/Kolkata"
      }
    });
  }

  // 2. OWNER role create ya find karo
  let role = await prisma.role.findUnique({
    where: { name: "OWNER" }
  });

  if (!role) {
    role = await prisma.role.create({
      data: { name: "OWNER" }
    });
  }

  // 3. Admin user upsert karo
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      roleId: role.id,
      organizationId: org.id
    },
    create: {
      name: "Boss Admin",
      email,
      passwordHash,
      organizationId: org.id,
      roleId: role.id
    }
  });

  console.log("✅ Admin successfully created/updated:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });