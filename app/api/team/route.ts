import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateMemberCode(name: string, departmentName?: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, "").slice(0, 6) || "USER";
  const deptTag = departmentName ? departmentName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() : "";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return deptTag ? `${cleanName}${deptTag}${randomSuffix}` : `${cleanName}${randomSuffix}`;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, departmentName, roleName = "EMPLOYEE" } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and Official Google Email are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "An employee with this Google email is already authorized" }, { status: 400 });
    }

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

    let generatedCode = generateMemberCode(name, departmentName);
    let codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    while (codeConflict) {
      generatedCode = generateMemberCode(name, departmentName);
      codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    }

    let roleRecord = await prisma.role.findFirst({
      where: { name: roleName.toUpperCase() },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: roleName.toUpperCase() },
      });
    }

    // Stores passwordHash as null - access is authenticated exclusively via Google OAuth
    const newMember = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        email: normalizedEmail,
        memberCode: generatedCode,
        passwordHash: null,
        departmentId,
        roleId: roleRecord.id,
        presenceStatus: "OFFLINE",
      },
      include: {
        role: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json({ error: "Failed to authorize employee" }, { status: 500 });
  }
}