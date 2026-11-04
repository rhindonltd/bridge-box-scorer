"use client";

import { useRequiredGame } from "@/context/GameContext";
import { updateCombinedRanking } from "@/lib/game-service";
import { reportError } from "@/lib/report-error";

/**
 * The per-game "combined vs separate ranking across sections" setting, with an
 * optimistic toggle handler. The setting only has meaning for a multi-section
 * game; callers gate the control on `sections.length > 1`.
 *
 * Shared so the Tables screen (and anywhere else a director can flip this)
 * reuses one implementation rather than duplicating the optimistic
 * update-with-rollback and the live-broadcast round-trip.
 */
export function useCombinedRanking(gameId: string): {
  combined: boolean;
  setCombined: (combined: boolean) => Promise<void>;
} {
  const { game, mutateGame } = useRequiredGame();

  async function setCombined(combined: boolean) {
    // Optimistically reflect the choice; the server broadcasts the fresh game
    // row (and a refreshed leaderboard) to every device on success.
    mutateGame({ ...game, combinedRanking: combined }, false);
    try {
      await updateCombinedRanking(gameId, combined);
    } catch (err) {
      // Roll back the optimistic change on failure.
      mutateGame({ ...game, combinedRanking: !combined }, false);
      reportError(err);
    }
  }

  return { combined: game.combinedRanking, setCombined };
}
