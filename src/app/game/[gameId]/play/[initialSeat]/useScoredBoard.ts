"use client";

import { useMemo } from "react";
import { useTravellerContext } from "@/context/TravellerContext";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { ScoringType } from "@/db/games/types/scoring-type";
import { Traveller } from "@/model/traveller";

/**
 * Score the board currently held by the surrounding {@link TravellerProvider}.
 *
 * Reads the live traveller instances, assembles a PAIR {@link Traveller} from
 * the ones that have a result, and scores it with the game's scoring type.
 * Returns null while no scored lines exist yet (nothing submitted for the
 * board). Keeps the scoring assembly out of the page component so the view
 * stays presentational.
 */
export function useScoredBoard(
  gameId: string,
  boardNumber: number,
  scoringType: ScoringType,
): ScoredBoard | null {
  const { instances } = useTravellerContext();

  return useMemo<ScoredBoard | null>(() => {
    const mode = "PAIR";

    const lines = instances
      .filter((i) => i.currentResult != null)
      .map((i) => ({
        nsId: i.participants.ns,
        ewId: i.participants.ew,
        outcome: i.currentResult,
      }));

    if (lines.length === 0) return null;

    const traveller: Traveller = {
      type: mode,
      mode,
      board: boardNumber,
      section: gameId,
      lines: lines as Traveller["lines"],
    };

    return scoreBoard(traveller, scoringType);
  }, [instances, gameId, scoringType, boardNumber]);
}
