export interface WorkloadSummary {
  totalActive: number;
  totalMinutes: number;
  overdueCount: number;
  dueTodayCount: number;
  inProgressCount: number;
  reviewCount: number;
}

export function calculateWorkload(tasks: any[]): WorkloadSummary {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let totalMinutes = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;
  let totalActive = 0;

  for (const t of tasks) {
    const isCompleted = t.status === "COMPLETED" || t.status === "APPROVED" || t.status === "CANCELLED";
    if (isCompleted) continue;

    totalActive++;
    totalMinutes += t.estimatedMinutes || 60;

    if (t.status === "IN_PROGRESS") inProgressCount++;
    if (t.status === "REVIEW") reviewCount++;

    if (t.dueAt) {
      const dueDate = new Date(t.dueAt);
      if (dueDate < now || t.status === "OVERDUE") {
        overdueCount++;
      } else if (dueDate >= startOfDay && dueDate <= endOfDay) {
        dueTodayCount++;
      }
    }
  }

  return {
    totalActive,
    totalMinutes,
    overdueCount,
    dueTodayCount,
    inProgressCount,
    reviewCount,
  };
}