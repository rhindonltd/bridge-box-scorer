import { GameType } from "@/db/games/types/game-type";
import { ScoringType } from "@/db/games/types/scoring-type";
import { SelectedMovement } from "@/model/selected-movement";

/**
 * The scoring/export format a game runs under — the cross-cutting answer to
 * "how is this event scored and exported", derived from the game type, the
 * scoring type, and the selected movement together.
 *
 * - PAIRS_BOARD: an ordinary pairs event (MP / Butler / Cross-IMP), ranked by
 *   pooling every table's result on a board.
 * - SWISS_PAIRS_VP: a Swiss Pairs event, ranked on per-round Victory Points.
 * - TEAMS_VP: a teams event ranked on per-round Victory Points (Swiss Teams
 *   today; every teams-VP movement shares this format regardless of how its
 *   schedule is drawn).
 */
export type EventFormat = "PAIRS_BOARD" | "SWISS_PAIRS_VP" | "TEAMS_VP";

/**
 * How a Swiss Pairs game derives its per-round Victory Points, or null when the
 * game is not a Swiss Pairs VP game (any non-Swiss movement, or a Swiss Pairs
 * game whose scoring method has no VP mapping). "IMP" converts each round's
 * head-to-head IMP margin; "MP" converts each round's field matchpoint
 * percentage.
 */
export type SwissVpMode = "IMP" | "MP" | null;

/**
 * The full classification of a game's event format, plus the scoring type and
 * (for Swiss Pairs) the VP sub-mode.
 */
export interface EventClassification {
  format: EventFormat;
  scoringType: ScoringType;
  /** Only meaningful for SWISS_PAIRS_VP; null for every other format. */
  swissVpMode: SwissVpMode;
}

/**
 * The single place the app classifies a game's scoring/export format.
 *
 * Cross-cutting consumers that must route on the format (the leaderboard
 * scorer and the USEBIO exporter) call this rather than re-deriving the
 * `gameType` + `movement.source` (+ `scoringType`) combination themselves.
 *
 * Note: movement-specific modules (rehydration, sit-out handling, the live
 * draw services, `selectedMovementsEqual`, and the setup hooks) still narrow on
 * `selected.source` locally — that is legitimate discriminated-union narrowing
 * against a movement they already hold, not the cross-cutting format question
 * this function answers.
 *
 * The rules preserve the behaviour these consumers had before this classifier
 * existed:
 * - A Teams game whose movement is a teams-VP movement (Swiss Teams or Teams
 *   Round Robin) is TEAMS_VP. (A TEAMS game type alone does not imply the teams
 *   format — the movement must also be one of those.)
 * - Any Swiss (Pairs) movement is SWISS_PAIRS_VP; its `swissVpMode` is the
 *   scoring type when that maps to a VP method (IMP or MP), else null. A Swiss
 *   movement with an unmapped scoring type therefore still classifies as
 *   SWISS_PAIRS_VP with a null mode, letting the leaderboard fall back to the
 *   board-pooled overall exactly as before.
 * - Everything else is PAIRS_BOARD.
 */
/**
 * Whether a selected movement is a teams-VP movement (ranked on per-round
 * Victory Points via the shared teams scorer). Both Swiss Teams and Teams Round
 * Robin qualify — they differ only in how the schedule is produced (live draw
 * vs fixed), not in how they are scored.
 */
function isTeamsVpMovement(movement: SelectedMovement | null): boolean {
  return (
    movement?.source === "SWISS_TEAMS" ||
    movement?.source === "ROUND_ROBIN_TEAMS"
  );
}

export function classifyEvent(
  gameType: GameType,
  scoringType: ScoringType,
  movement: SelectedMovement | null,
): EventClassification {
  if (gameType === "TEAMS" && isTeamsVpMovement(movement)) {
    return { format: "TEAMS_VP", scoringType, swissVpMode: null };
  }

  if (movement?.source === "SWISS") {
    const swissVpMode: SwissVpMode =
      scoringType === "IMP" || scoringType === "MP" ? scoringType : null;
    return { format: "SWISS_PAIRS_VP", scoringType, swissVpMode };
  }

  return { format: "PAIRS_BOARD", scoringType, swissVpMode: null };
}
