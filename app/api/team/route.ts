import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function generateMemberCode(name: string, departmentName?: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, "").slice(0, 6) || "USER";
  const deptTag = departmentName ? departmentName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() : "";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit salt
  return deptTag ? `${cleanName}${deptTag}${randomSuffix}` : `${cleanName}${randomSuffix}`;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [members, departments] = await Promise.all([
      prisma.user.findMany({
        where: { organizationId: session.organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          memberCode: true,
          role: { select: { name: true } },
          department: { select: { id: true, name: true } },
          presenceStatus: true,
          taskAssignments: { select: { id: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.department.findMany({
        where: { organizationId: session.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ members, departments });
  } catch (error) {
    console.error("Fetch members error:", error);
    return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, departmentName, password, roleName = "EMPLOYEE" } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and Email are required" }, { status: 400 });
    }

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
    }

    // 1. Connect or create department
    let departmentId = null;
    if (departmentName?.trim()) {
      let dept = await prisma.department.findFirst({
        where: {
          organizationId: session.organizationId,
          name: departmentName.trim(),
        },
      });

      if (!dept) {
        dept = await prisma.department.create({
          data: {
            organizationId: session.organizationId,
            name: departmentName.trim(),
          },
        });
      }
      departmentId = dept.id;
    }

    // 2. Generate Guaranteed Unique Handle Code (@NameDept1234)
    let generatedCode = generateMemberCode(name, departmentName);
    let codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    while (codeConflict) {
      generatedCode = generateMemberCode(name, departmentName);
      codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    }

    // 3. Password Hash
    const hashedPassword = await bcrypt.hash(password || "Taskflow@2026", 10);

    // 4. Role Assignment
    let roleRecord = await prisma.role.findFirst({
      where: { name: roleName.toUpperCase() },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: roleName.toUpperCase() },
      });
    }

    // 5. Create Member Account
    const newMember = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        memberCode: generatedCode,
        departmentId,
        roleId: roleRecord.id,
        passwordHash: hashedPassword,
        presenceStatus: "OFFLINE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberCode: true,
        department: { select: { id: true, name: true } },
      },
    });

    // 6. Send Onboarding Welcome Notification
    await prisma.notification.create({
      data: {
        organizationId: session.organizationId,
        userId: newMember.id,
        actorId: session.id,
        category: "SYSTEM",
        priority: "HIGH",
        title: `Welcome to the Workspace!`,
        content: `Your unique assignment handle is @${newMember.memberCode}. You can now be tagged directly in tasks.`,
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json({ error: "Failed to register member" }, { status: 500 });
  }
}