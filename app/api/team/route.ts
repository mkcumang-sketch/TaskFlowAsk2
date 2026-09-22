import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateMemberCode(name: string, departmentName?: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, "").slice(0, 6) || "USER";
  const deptTag = departmentName ? departmentName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() : "EMP";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName}${deptTag}${randomSuffix}`;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      departmentId,
      departmentIds = [],
      newDepartmentName,
      roleName = "EMPLOYEE",
    } = body;

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

    // 1. Gather all department IDs (single or multiple)
    const targetDeptIds: string[] = Array.isArray(departmentIds) ? [...departmentIds] : [];
    if (departmentId && !targetDeptIds.includes(departmentId)) {
      targetDeptIds.push(departmentId);
    }

    // Agar user ne naya department enter kiya ho
    if (newDepartmentName?.trim()) {
      let createdDept = await prisma.department.findFirst({
        where: {
          organizationId: session.organizationId,
          name: newDepartmentName.trim(),
        },
      });

      if (!createdDept) {
        createdDept = await prisma.department.create({
          data: {
            organizationId: session.organizationId,
            name: newDepartmentName.trim(),
          },
        });
      }
      if (!targetDeptIds.includes(createdDept.id)) {
        targetDeptIds.push(createdDept.id);
      }
    }

    // Primary department for User table
    const primaryDeptId = targetDeptIds[0] || null;

    // 2. Fetch primary department info for Member Code
    let primaryDeptName: string | undefined = undefined;
    if (primaryDeptId) {
      const pDept = await prisma.department.findUnique({ where: { id: primaryDeptId } });
      if (pDept) primaryDeptName = pDept.name;
    }

    let generatedCode = generateMemberCode(name, primaryDeptName);
    let codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    while (codeConflict) {
      generatedCode = generateMemberCode(name, primaryDeptName);
      codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    }

    // 3. Resolve Role
    let roleRecord = await prisma.role.findFirst({
      where: { name: roleName.toUpperCase() },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: roleName.toUpperCase() },
      });
    }

    // 4. Create Employee
    const newMember = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        email: normalizedEmail,
        memberCode: generatedCode,
        passwordHash: null,
        departmentId: primaryDeptId,
        roleId: roleRecord.id,
        presenceStatus: "OFFLINE",
      },
      include: {
        role: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // 5. Auto-Create Group Chat & Auto-Enroll User into ALL Selected Departments
    for (const dId of targetDeptIds) {
      try {
        const dept = await prisma.department.findUnique({ where: { id: dId } });
        if (!dept) continue;

        let groupConversation = await prisma.conversation.findFirst({
          where: {
            organizationId: session.organizationId,
            departmentId: dId,
            type: "DEPARTMENT",
          },
        });

        if (!groupConversation) {
          groupConversation = await prisma.conversation.create({
            data: {
              organizationId: session.organizationId,
              departmentId: dId,
              type: "DEPARTMENT",
              name: `${dept.name} Team`,
              description: `Official channel for ${dept.name} department.`,
            },
          });
        }

        // Add user to conversation participants
        await prisma.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: groupConversation.id,
              userId: newMember.id,
            },
          },
          create: {
            conversationId: groupConversation.id,
            userId: newMember.id,
            role: "MEMBER",
          },
          update: {},
        });
      } catch (groupErr) {
        console.warn(`Failed to auto-join dept ${dId}:`, groupErr);
      }
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json({ error: "Failed to authorize employee" }, { status: 500 });
  }
}