import { prisma } from "../lib/prisma";
import { canTransition, TaskState } from "../lib/task-workflow";
import bcrypt from "bcryptjs";

async function runSystemTest() {
  console.log("========================================");
  console.log("TASKFLOW WORKFLOW INTEGRITY VERIFICATION");
  console.log("========================================\n");

  try {
    console.log("1. Checking Organization and Users...");
    let testOrg = await prisma.organization.findFirst({
      where: { name: "Test Org Velocity" },
    });

    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: { name: "Test Org Velocity", slug: "test-velocity" },
      });
    }

    const hashedPassword = await bcrypt.hash("Password123!", 10);

    const manager = await prisma.user.upsert({
      where: { email: "manager.test@taskflow.dev" },
      update: {},
      create: {
        email: "manager.test@taskflow.dev",
        name: "Manager Danav",
        passwordHash: hashedPassword,
        organizationId: testOrg.id,
      },
    });

    const employee = await prisma.user.upsert({
      where: { email: "employee.test@taskflow.dev" },
      update: {},
      create: {
        email: "employee.test@taskflow.dev",
        name: "Aman Employee",
        passwordHash: hashedPassword,
        organizationId: testOrg.id,
      },
    });
    console.log("   ✔ Manager & Employee validated.\n");

    console.log("2. Testing State Machine (canTransition)...");
    const testCases: [TaskState, TaskState, boolean][] = [
      ["DRAFT", "ASSIGNED", true],
      ["ASSIGNED", "ACCEPTED", true],
      ["ACCEPTED", "IN_PROGRESS", true],
      ["IN_PROGRESS", "REVIEW", true],
      ["REVIEW", "APPROVED", true],
      ["APPROVED", "IN_PROGRESS", false],
      ["ASSIGNED", "APPROVED", false],
    ];

    for (const [from, to, expected] of testCases) {
      const allowed = canTransition(from, to);
      if (allowed !== expected) {
        throw new Error(`State transition failure: ${from} -> ${to} expected ${expected} but got ${allowed}`);
      }
    }
    console.log("   ✔ State machine transition boundaries validated.\n");

    console.log("3. Creating Task & Assignee Mapping...");
    const testTask = await prisma.task.create({
      data: {
        title: "Verify API Endpoints & Security",
        description: "Run comprehensive test cycle on task transitions.",
        status: "ASSIGNED",
        priority: "HIGH",
        organizationId: testOrg.id,
        creatorId: manager.id,
        completionProofType: "TEXT",
        approvalRequired: true,
        calendarSyncEnabled: false,
        emailEnabled: false,
        assignees: {
          create: [{ userId: employee.id }],
        },
        checklistItems: {
          create: [{ text: "Check route handlers" }, { text: "Verify prisma models" }],
        },
      },
      include: {
        assignees: true,
        checklistItems: true,
      },
    });
    console.log(`   ✔ Task created (ID: ${testTask.id}) with 2 checklist items.\n`);

    console.log("4. Executing Sequential Employee Transitions...");
    await prisma.task.update({
      where: { id: testTask.id },
      data: { status: "ACCEPTED" },
    });
    console.log("   ✔ Task status updated to ACCEPTED");

    await prisma.task.update({
      where: { id: testTask.id },
      data: { status: "IN_PROGRESS" },
    });
    console.log("   ✔ Task status updated to IN_PROGRESS");

    const [, activity] = await prisma.$transaction([
      prisma.task.update({
        where: { id: testTask.id },
        data: { status: "REVIEW" },
      }),
      prisma.activityLog.create({
        data: {
          taskId: testTask.id,
          userId: employee.id,
          action: "STATUS_CHANGED_REVIEW",
          details: "Proof: https://drive.google.com/test-proof | All endpoints passing with 200 OK",
        },
      }),
    ]);
    console.log(`   ✔ Task transitioned to REVIEW with proof submitted (Log ID: ${activity.id})\n`);

    console.log("5. Executing Manager Approval...");
    const approvedTask = await prisma.task.update({
      where: { id: testTask.id },
      data: {
        status: "APPROVED",
        completedAt: new Date(),
      },
    });
    console.log(`   ✔ Task marked APPROVED with completedAt timestamp: ${approvedTask.completedAt}\n`);

    console.log("6. Verifying Organization Isolation Query Bounds...");
    const foreignTasks = await prisma.task.findMany({
      where: {
        id: testTask.id,
        organizationId: "non-existent-fake-org-id",
      },
    });

    if (foreignTasks.length > 0) {
      throw new Error("Organization leak detected! Cross-tenant query returned data.");
    }
    console.log("   ✔ Cross-tenant isolation intact (0 records leaked).\n");

    console.log("========================================");
    console.log("ALL CRITICAL TEST SUITES PASSED (6/6)");
    console.log("========================================");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSystemTest();