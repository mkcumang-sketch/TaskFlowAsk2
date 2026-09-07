"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PoolClaimButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function claim() {
    setLoading(true);
    const response = await fetch(`/api/tasks/${taskId}/claim`, { method: "POST" });
    if (!response.ok) alert((await response.json()).error || "Unable to claim task");
    else router.refresh();
    setLoading(false);
  }
  return <button onClick={claim} disabled={loading} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{loading ? "Claiming..." : "Claim task"}</button>;
}
