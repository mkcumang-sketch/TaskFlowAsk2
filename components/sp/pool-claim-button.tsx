"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PoolClaimButton({ taskId }: { taskId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClaim = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/claim`, {
        method: "POST",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to claim task");
      }
    } catch {
      alert("Network error while claiming task.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
    >
      {loading ? "Claiming..." : "Claim Task"}
    </button>
  );
}