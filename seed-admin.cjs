const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@ask2global.com";
  const password = "admin@2390";
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Organization ensure karo
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Ask2Global",
        slug: "ask2global",
      },
    });
  }

  // 2. Role ensure karo
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

  // 3. User upsert karo (passwordHash ke sath)
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

  console.log("--> ADMIN ACCOUNT READY IN DB:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });