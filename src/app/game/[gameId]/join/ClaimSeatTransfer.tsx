"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimSeatTransfer } from "@/lib/game-service";
import { ClaimSeatTransferView } from "./ClaimSeatTransferView";

/**
 * "Move a seat to this device" affordance for the join screen. Opens a dialog
 * to enter a transfer code; on success the seat's secret has been rotated to
 * this device (invalidating the old one), so we route straight into the seat's
 * play screen.
 */
export function ClaimSeatTransfer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setCode("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    reset();
  }

  function handleSubmit() {
    if (code.trim().length < 6) return;
    setError(null);
    setLoading(true);

    claimSeatTransfer(code.trim().toUpperCase())
      .then(({ gameId, seat }) => {
        router.replace(`/game/${gameId}/play/${seat}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to move seat");
        setLoading(false);
      });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-blue-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Moving from another device? Enter a code
      </button>

      {/* Presented as a full-screen page (header bar + back button + centered
          form + fixed-bottom action) rather than a small dialog. Pinned over
          the app within its max-width cage. */}
      {open && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="mx-auto flex h-full max-w-2xl flex-col">
            <ClaimSeatTransferView
              code={code}
              error={error}
              loading={loading}
              onCodeChange={setCode}
              onSubmit={handleSubmit}
              onCancel={handleClose}
            />
          </div>
        </div>
      )}
    </>
  );
}
