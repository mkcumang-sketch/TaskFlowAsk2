"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface TaskActionsProps {
  taskId: string;
  currentStatus: string;
  completionProofType?: string;
  isManager?: boolean;
  isAssignee?: boolean;
  onStatusUpdated?: () => void;
}

export function TaskActionButtons({
  taskId,
  currentStatus,
  isManager = false,
  isAssignee = false,
  onStatusUpdated,
}: TaskActionsProps) {
  const [loading, setLoading] = useState(false);
  const [proofNote, setProofNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const executeTransition = async (nextStatus: string, metadata = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextStatus,
          ...metadata,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || "Action failed");
        return;
      }

      setShowProofModal(false);
      setShowRejectModal(false);
      if (onStatusUpdated) onStatusUpdated();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Transition failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {/* 1. AGENT ACTIONS: Accept & Start */}
      {isAssignee && currentStatus === "ASSIGNED" && (
        <Button
          size="sm"
          disabled={loading}
          onClick={() => executeTransition("ACCEPTED")}
          className="bg-slate-900 text-white hover:bg-slate-800 text-xs px-3 py-1.5 h-auto cursor-pointer"
        >
          {loading ? "Accepting..." : "Accept Task"}
        </Button>
      )}

      {isAssignee && currentStatus === "ACCEPTED" && (
        <Button
          size="sm"
          disabled={loading}
          onClick={() => executeTransition("IN_PROGRESS")}
          className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-3 py-1.5 h-auto cursor-pointer"
        >
          {loading ? "Starting..." : "Start Work"}
        </Button>
      )}

      {/* 2. AGENT ACTION ONLY: Submit Work Proof */}
      {isAssignee && (currentStatus === "IN_PROGRESS" || currentStatus === "REJECTED") && (
        <Button
          size="sm"
          disabled={loading}
          onClick={() => setShowProofModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 h-auto cursor-pointer"
        >
          Submit Proof & Review
        </Button>
      )}

      {/* 3. Status text for Agent while under review */}
      {isAssignee && currentStatus === "REVIEW" && (
        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
          ⏳ Proof submitted — waiting for Admin approval
        </span>
      )}

      {/* 4. ADMIN/MANAGER STATUS MESSAGES */}
      {isManager && !isAssignee && currentStatus === "ASSIGNED" && (
        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
          ⏳ Waiting for Agent to Accept
        </span>
      )}

      {isManager && !isAssignee && currentStatus === "IN_PROGRESS" && (
        <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
          ⚡ Agent is working on this task
        </span>
      )}

      {/* 5. ADMIN/MANAGER ACTIONS: Approve or Reject Proof */}
      {currentStatus === "REVIEW" && isManager && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 h-auto cursor-pointer"
            disabled={loading}
            onClick={() => executeTransition("APPROVED")}
          >
            ✓ Approve Task
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 py-1.5 h-auto cursor-pointer"
            disabled={loading}
            onClick={() => setShowRejectModal(true)}
          >
            ✕ Reject / Request Changes
          </Button>
        </div>
      )}

      {/* 6. Completed State */}
      {(currentStatus === "APPROVED" || currentStatus === "COMPLETED") && (
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
          ✓ Verified & Completed
        </span>
      )}

      {/* PROOF SUBMISSION MODAL */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">Submit Work Proof</h3>
              <button
                onClick={() => setShowProofModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Attach any deliverable link (Google Drive, Live URL, Figma, PDF) or write notes.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Proof URL / Drive / Live Link
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Notes / Deliverable Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of the work done or files attached..."
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProofModal(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={loading || (!proofUrl.trim() && !proofNote.trim())}
                onClick={() =>
                  executeTransition("REVIEW", { proofUrl, note: proofNote })
                }
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 cursor-pointer"
              >
                {loading ? "Submitting..." : "Submit to Admin"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-red-600">Request Changes / Rejection</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Feedback for Agent
              </label>
              <textarea
                rows={3}
                required
                placeholder="Specify what needs correction or re-submission..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-red-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={loading || !rejectionReason.trim()}
                onClick={() =>
                  executeTransition("REJECTED", { rejectionReason })
                }
                className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 cursor-pointer"
              >
                {loading ? "Submitting..." : "Send Back for Rework"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}