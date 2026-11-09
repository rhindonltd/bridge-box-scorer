"use client";

import { useState } from "react";
import PlayerSearch from "@/app/game/[gameId]/join/PlayerSearch";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import type { NewPlayer } from "@/db/games/tables/players";

export interface HandoverPlayersPageProps {
  /** Cancel and return to play. */
  onCancel: () => void;
  /** Seat the arriving pair, taking over this device. Rejects to show an error. */
  onSubmit: (player1: NewPlayer, player2: NewPlayer) => Promise<void>;
}

/**
 * The arriving real pair's name-entry screen for a SAME-DEVICE handover
 * (Path 1). A stand-in has been sitting this seat; the real pair enters their
 * own names/EBU numbers (reusing the join flow's {@link PlayerSearch}) and
 * takes over this device. No scoring options are entered here — the director
 * sets them later on the "Substitutions" screen.
 */
export function HandoverPlayersPage({
  onCancel,
  onSubmit,
}: HandoverPlayersPageProps) {
  const [player1, setPlayer1] = useState<NewPlayer | null>(null);
  const [player2, setPlayer2] = useState<NewPlayer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = player1 != null && player2 != null && !submitting;

  async function handleSubmit() {
    if (player1 == null || player2 == null) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(player1, player2);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not hand over. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <GamePageLayout
      headerTitle="Handover"
      contentMode="scroll"
      backAction={onCancel}
      actions={
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? "Taking over..." : "Take over this device"}
        </button>
      }
    >
      <div className="flex flex-col gap-5 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <p className="text-sm text-gray-600">
          Enter your names to take over this seat. You keep this device and
          carry on from the next board.
        </p>

        <PlayerSearch label="Player 1" value={player1} onChange={setPlayer1} />
        <PlayerSearch label="Player 2" value={player2} onChange={setPlayer2} />

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    </GamePageLayout>
  );
}
