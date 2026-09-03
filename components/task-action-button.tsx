"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface TaskActionsProps {
  taskId: string;
  currentStatus: string;
  completionProofType: string;
  isManager?: boolean;
  onStatusUpdated?: () => void;
}

export function TaskActionButtons({
  taskId,
  currentStatus,
  completionProofType,
  isManager = false,
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
      {/* 1. Employee: Accept or Start */}
      {currentStatus === "ASSIGNED" && (
        <Button
          size="sm"
          disabled={loading}
          onClick={() => executeTransition("ACCEPTED")}
        >
          Accept Task
        </Button>
      )}

      {currentStatus === "ACCEPTED" && (
        <Button
          size="sm"
          disabled={loading}
          onClick={() => executeTransition("IN_PROGRESS")}
        >
          Start Work
        </Button>
      )}

      {/* 2. Employee: Submit Proof for Review */}
      {currentStatus === "IN_PROGRESS" && (
        <>
          {completionProofType !== "NONE" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowProofModal(true)}
            >
              Submit Proof & Review
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={loading}
              onClick={() => executeTransition("REVIEW")}
            >
              Submit for Review
            </Button>
          )}
        </>
      )}

      {/* 3. Manager: Approve / Reject Decision */}
      {currentStatus === "REVIEW" && isManager && (
        <>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={loading}
            onClick={() => executeTransition("APPROVED")}
          >
            Approve Task
          </Button>

          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={loading}
            onClick={() => setShowRejectModal(true)}
          >
            Reject / Changes
          </Button>
        </>
      )}

      {/* Proof Submission Dialog */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Submit Work Proof</h3>
            <p className="text-xs text-slate-500">
              Required Proof Type: <span className="font-semibold text-slate-700">{completionProofType}</span>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Proof URL / File Link</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Completion Notes</label>
              <textarea
                rows={3}
                placeholder="Details of deliverables completed..."
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowProofModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={loading || (!proofUrl && !proofNote)}
                onClick={() =>
                  executeTransition("REVIEW", { proofUrl, note: proofNote })
                }
              >
                {loading ? "Submitting..." : "Submit to Manager"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-red-600">Request Changes / Rejection</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Feedback / Rejection Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Explain what needs to be fixed..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={loading || !rejectionReason.trim()}
                onClick={() =>
                  executeTransition("REJECTED", { rejectionReason })
                }
              >
                {loading ? "Submitting..." : "Send Back to Employee"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}