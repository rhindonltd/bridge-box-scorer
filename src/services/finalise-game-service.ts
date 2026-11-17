import type { Db } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { getResultsSummary } from "@/db/games/queries/get-results-summary";
import {
  getOutstandingBoards,
  OUTSTANDING_DETAIL_LIMIT,
} from "@/db/games/queries/get-outstanding-boards";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { boardTitle, pairsLabel } from "@/lib/board-labels";
import type {
  FinaliseCheckResult,
  FinaliseProblem,
} from "@/model/finalise-validator";

/**
 * Read-only check of whether a game can be finalised right now. Reports game
 * problems only: the game must have started, and every playable board must have
 * a final result. Boards are named when only a few are outstanding; otherwise
 * the count stands alone.
 */
export async function checkFinalise(
  gameId: string,
  db: Db,
): Promise<FinaliseCheckResult> {
  const game = await findGameById(gameId);
  if (game?.finalisedAt) {
    return {
      canFinalise: false,
      problems: [
        {
          code: "ALREADY_FINALISED",
          message: "This game is already finalised.",
        },
      ],
    };
  }

  if (!(await isGameStarted(gameId))) {
    return {
      canFinalise: false,
      problems: [
        {
          code: "NOT_STARTED",
          message: "The game has not been started yet.",
        },
      ],
    };
  }

  const summary = await getResultsSummary(db);
  const outstanding = Math.max(summary.totalPlayable - summary.finalized, 0);
  if (outstanding === 0) {
    return { canFinalise: true, problems: [] };
  }

  const problems: FinaliseProblem[] = [];
  const countMessage = `${outstanding} of ${summary.totalPlayable} results ${
    outstanding === 1 ? "is" : "are"
  } still outstanding.`;

  if (outstanding <= OUTSTANDING_DETAIL_LIMIT) {
    const [boards, sections] = await Promise.all([
      getOutstandingBoards(db, OUTSTANDING_DETAIL_LIMIT),
      findSections(db),
    ]);
    const multiSection = sections.length > 1;
    const labels = Object.fromEntries(
      sections.map((s) => [s.section, s.label]),
    );
    if (boards.length > 0) {
      for (const b of boards) {
        problems.push({
          code: "RESULTS_OUTSTANDING",
          message: `No result yet: ${boardTitle(b, multiSection, labels)} (${pairsLabel(b.nsPair, b.ewPair)}).`,
          section: b.section,
        });
      }
      return { canFinalise: false, problems };
    }
  }

  problems.push({ code: "RESULTS_OUTSTANDING", message: countMessage });
  return { canFinalise: false, problems };
}
