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
    const { name, email, departmentId, departmentName, roleName = "EMPLOYEE" } = body;

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

    // 1. Resolve or Create Department
    let targetDeptId: string | null = null;
    let targetDeptRecord: any = null;

    if (departmentId) {
      targetDeptRecord = await prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId: session.organizationId,
        },
      });
      if (targetDeptRecord) targetDeptId = targetDeptRecord.id;
    }

    if (!targetDeptId && departmentName?.trim()) {
      targetDeptRecord = await prisma.department.findFirst({
        where: {
          organizationId: session.organizationId,
          name: departmentName.trim(),
        },
      });

      if (!targetDeptRecord) {
        targetDeptRecord = await prisma.department.create({
          data: {
            organizationId: session.organizationId,
            name: departmentName.trim(),
          },
        });
      }
      targetDeptId = targetDeptRecord.id;
    }

    // 2. Member code generation
    let generatedCode = generateMemberCode(name, targetDeptRecord?.name);
    let codeConflict = await prisma.user.findFirst({ where: { memberCode: generatedCode } });
    while (codeConflict) {
      generatedCode = generateMemberCode(name, targetDeptRecord?.name);
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

    // 4. Create the new Employee
    const newMember = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: name.trim(),
        email: normalizedEmail,
        memberCode: generatedCode,
        passwordHash: null,
        departmentId: targetDeptId,
        roleId: roleRecord.id,
        presenceStatus: "OFFLINE",
      },
      include: {
        role: { select: { name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // 5. Auto-Create Group Chat for Department & Auto-Enroll User
    if (targetDeptId && targetDeptRecord) {
      try {
        let groupConversation = await prisma.conversation.findFirst({
          where: {
            organizationId: session.organizationId,
            departmentId: targetDeptId,
            type: "DEPARTMENT",
          },
        });

        if (!groupConversation) {
          groupConversation = await prisma.conversation.create({
            data: {
              organizationId: session.organizationId,
              departmentId: targetDeptId,
              type: "DEPARTMENT",
              name: `${targetDeptRecord.name} Team`,
              description: `Official channel for ${targetDeptRecord.name} department.`,
            },
          });
        }

        // Add member to group conversation
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
      } catch (chatErr) {
        console.warn("Auto-join department group skipped (non-fatal):", chatErr);
      }
    }

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Create member error:", error);
    return NextResponse.json({ error: "Failed to authorize employee" }, { status: 500 });
  }
}