const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  try {
    const email = "admin@ask2global.com";
    const rawPassword = "Admin@2390";
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 1. Ensure the ADMIN role exists
    const role = await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { name: "ADMIN" },
    });

    // 2. Ensure Organization exists (if needed by your schema)
    let org = null;
    try {
      org = await prisma.organization.upsert({
        where: { slug: "ask2global" },
        update: {},
        create: { name: "Ask2Global", slug: "ask2global" },
      });
    } catch {
      // Ignore if organization model isn't strictly required
    }

    // 3. Upsert Admin User
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        roleId: role.id,
        ...(org ? { organizationId: org.id } : {}),
      },
      create: {
        email,
        name: "Admin User",
        passwordHash,
        roleId: role.id,
        ...(org ? { organizationId: org.id } : {}),
      },
      include: { role: true },
    });

    console.log(`\nSUCCESS: User ${user.email} is ready with role: ${user.role?.name}`);
  } catch (err) {
    console.error("Failed to seed admin:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();