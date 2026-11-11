"use client";

import { useState } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface WithdrawPageProps {
  /** Back to play without withdrawing. */
  onCancel: () => void;
  /** Withdraw the pair. Rejects with the server's message on failure. */
  onConfirm: () => Promise<void>;
  /** After a successful withdrawal: leave the play screens. */
  onDone: () => void;
}

/**
 * Design §11 — a pair withdraws itself from the event. Withdrawing is final
 * (there is no undo from the player side), so the screen asks for an explicit
 * confirmation first and explains what happens to the boards still to come:
 * they won't be played, and the director decides how they are scored.
 */
export function WithdrawPage({
  onCancel,
  onConfirm,
  onDone,
}: WithdrawPageProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not withdraw. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <GamePageLayout
        headerTitle="Withdrawn"
        contentMode="center"
        hideBack
        actions={
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Done
          </button>
        }
      >
        <div className="px-6 py-6 max-w-sm w-full mx-auto text-center">
          <p className="text-base text-gray-800">
            Your pair has withdrawn. Your opponents will be moved on, and the
            director will decide how the boards you miss are scored.
          </p>
        </div>
      </GamePageLayout>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Withdraw"
      contentMode="center"
      // The header back arrow is the way to cancel (there is no separate
      // Cancel button). Hide it while the withdrawal is in flight so the
      // player can't leave mid-request.
      // (An explicit backAction always renders the arrow, so drop it too.)
      backAction={busy ? undefined : onCancel}
      hideBack={busy}
      actions={
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={busy}
          className="w-full rounded-xl bg-red-600 py-3 text-lg font-bold text-white transition hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {busy ? "Withdrawing..." : "Withdraw"}
        </button>
      }
    >
      {/* Matches the WiFi "can't be changed on this device" screen: a bold
          headline with a short explanation, centred on the page. */}
      <div className="flex flex-col gap-2 px-6 py-6 max-w-sm w-full mx-auto text-center">
        <h1 className="text-xl font-bold text-gray-900">
          Withdraw your pair from the event?
        </h1>
        <p className="text-base text-gray-600">
          You won&rsquo;t play any more boards, starting with the next board you
          haven&rsquo;t scored.
        </p>
        <p className="text-base text-gray-600">
          Results you&rsquo;ve already entered stand. This can&rsquo;t be undone
          from your device — if it&rsquo;s a mistake, ask the director.
        </p>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    </GamePageLayout>
  );
}
