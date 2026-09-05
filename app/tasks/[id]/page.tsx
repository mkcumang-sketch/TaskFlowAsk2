import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { TaskTimer } from "@/components/task-timer";
import { TaskActionButtons } from "@/components/task-action-button";
import { TaskSubtasksSection, TaskCommentsSection } from "@/components/task-detail-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const normalizedRole = (user.role || "EMPLOYEE").toUpperCase();
  const taskId = (await params).id;

  const isManager =
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "ADMIN" ||
    normalizedRole === "OWNER" ||
    normalizedRole === "MANAGER";

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId: user.organizationId ?? undefined,
    },
    include: {
      comments: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
      assignees: { include: { user: true } },
      creator: true,
      subtasks: { orderBy: { createdAt: "asc" } },
      project: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return (
      <AppShell title="Task not found" userRole={normalizedRole}>
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          No task exists for this workspace.
        </div>
      </AppShell>
    );
  }

  const isAssignee =
    task.assignees?.some((a) => a.userId === user.id) ||
    task.assigneeEmail === user.email;

  // Extract Proof Comments submitted by employee
  const proofComments = task.comments.filter(
    (c) =>
      c.content.includes("Proof") ||
      c.content.includes("http") ||
      c.content.includes("drive.google") ||
      c.content.includes("Note:")
  );

  return (
    <AppShell
      title={task.title}
      subtitle={`${task.status} • Priority: ${task.priority}`}
      userRole={normalizedRole}
    >
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        {/* Main Content Area */}
        <div className="space-y-6">
          {/* PROOF & REVIEW CARD: Highlighted for Admin Inspection */}
          {(task.status === "REVIEW" || proofComments.length > 0) && (
            <div className="rounded-3xl border-2 border-purple-300 bg-purple-50/60 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <h3 className="text-base font-bold text-purple-950">
                    Agent Work Proof & Deliverables
                  </h3>
                </div>
                <span className="rounded-full bg-purple-200/80 px-2.5 py-0.5 text-xs font-bold text-purple-800">
                  {task.status === "REVIEW" ? "Awaiting Verification" : "Delivered"}
                </span>
              </div>

              {proofComments.length > 0 ? (
                <div className="space-y-2">
                  {proofComments.map((proof) => {
                    // Extract URL if present
                    const urlMatch = proof.content.match(/(https?:\/\/[^\s]+)/g);
                    const extractedUrl = urlMatch ? urlMatch[0] : null;

                    return (
                      <div
                        key={proof.id}
                        className="rounded-2xl border border-purple-100 bg-white p-4 space-y-2 text-xs text-slate-700 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-50 pb-1.5">
                          <span>Submitted by {proof.author?.name || "Agent"}</span>
                          <span>{new Date(proof.createdAt).toLocaleString()}</span>
                        </div>

                        {extractedUrl && (
                          <div className="pt-1">
                            <span className="font-semibold text-slate-900 block mb-1">
                              Deliverable Link:
                            </span>
                            <a
                              href={extractedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 font-medium text-white hover:bg-purple-700 transition"
                            >
                              🔗 Open Deliverable File &rarr;
                            </a>
                          </div>
                        )}

                        <div className="whitespace-pre-line text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {proof.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-purple-800 italic">
                  Agent has moved this task to Review. Awaiting submission logs.
                </p>
              )}

              {/* Admin Action Bar directly on the Proof Card */}
              {isManager && task.status === "REVIEW" && (
                <div className="pt-2 border-t border-purple-200">
                  <p className="text-xs font-semibold text-purple-900 mb-2">
                    Review Verification Decision:
                  </p>
                  <TaskActionButtons
                    taskId={task.id}
                    currentStatus={task.status}
                    isManager={isManager}
                    isAssignee={isAssignee}
                  />
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
              Description
            </div>
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {task.description || "No description added yet."}
            </p>

            {/* Interactive Subtasks */}
            <div className="mt-6">
              <TaskSubtasksSection taskId={task.id} initialSubtasks={task.subtasks} />
            </div>

            {/* Comments & Updates */}
            <div className="mt-6">
              <TaskCommentsSection taskId={task.id} initialComments={task.comments} />
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <aside className="space-y-6">
          {/* Phase 4 Live Time Tracker Widget */}
          <TaskTimer taskId={task.id} initialActualMinutes={task.actualMinutes || 0} />

          {/* Status & Actions Box */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400">
              Quick Actions
            </div>
            <TaskActionButtons
              taskId={task.id}
              currentStatus={task.status}
              isManager={isManager}
              isAssignee={isAssignee}
            />
          </div>

          {/* Meta Information */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
              Details
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Project</span>
                <span className="font-semibold text-slate-900">
                  {task.project?.name || "None"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Assignee</span>
                <span className="font-semibold text-slate-900">
                  {task.assignees[0]?.user?.name || "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Due Date</span>
                <span className="font-semibold text-slate-900">
                  {task.dueAt ? formatDateTime(task.dueAt) : "No due date"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Priority</span>
                <span className="font-semibold text-slate-900">{task.priority}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2.5">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-slate-900">{task.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimate</span>
                <span className="font-semibold text-slate-900">
                  {task.estimatedMinutes ? `${task.estimatedMinutes}m` : "Not set"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}