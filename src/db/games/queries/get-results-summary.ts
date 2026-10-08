import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { eq } from "drizzle-orm";

export interface ResultsSummary {
  /**
   * Number of boards that can be played (every board except sit-outs and
   * half-match compensation blocks, both of which the scorer resolves).
   */
  totalPlayable: number;
  /** Number of playable boards that have a final result recorded. */
  finalized: number;
  /**
   * Whether every playable board has a final result. False when there are no
   * playable boards at all (e.g. the game has not been started).
   */
  allResultsIn: boolean;
}

/**
 * Summarise how many playable boards have a final result recorded.
 *
 * A board is "playable" when it is neither a SIT_OUT nor a HALF_AVERAGE. It is
 * "finalized" once it has a confirmed, director-overridden, or cancelled
 * (fouled) result — equivalently a status of CONFIRMED, OVERRIDDEN, or
 * CANCELLED. Boards still NOT_PLAYED, PENDING_CONFIRMATION, or with no status
 * yet count as outstanding.
 *
 * SIT_OUT (a bye) and HALF_AVERAGE (a Swiss "2 half matches" compensation
 * block for the half a non-anchor pair misses) are both resolved by the scorer,
 * never submitted by players, so they must not count as outstanding — otherwise
 * a round that contains a half-match group could never reach `allResultsIn` and
 * the director could never draw the next round.
 *
 * `allResultsIn` is true only when there is at least one playable board and all
 * of them are finalized, which is the signal used to enable USEBIO export and
 * the Swiss "draw next round" control.
 */
export async function getResultsSummary(db: Db): Promise<ResultsSummary> {
  // Join each board to its match so a voided / mismatched match (ruling now on
  // `matches.ruling`) counts as finalized even if its boards were never played.
  const rows = await db
    .select({ status: boards.status, ruling: matches.ruling })
    .from(boards)
    .innerJoin(matches, eq(boards.matchId, matches.id));

  const playable = rows.filter(
    (r) => r.status !== "SIT_OUT" && r.status !== "HALF_AVERAGE",
  );
  const finalized = playable.filter(
    (r) =>
      r.status === "CONFIRMED" ||
      r.status === "OVERRIDDEN" ||
      r.status === "CANCELLED" ||
      r.status === "REMOVED_TEAMS" ||
      // A match-level void / mismatch ruling resolves the board.
      r.ruling != null,
  );

  const totalPlayable = playable.length;
  const finalizedCount = finalized.length;

  return {
    totalPlayable,
    finalized: finalizedCount,
    allResultsIn: totalPlayable > 0 && finalizedCount === totalPlayable,
  };
}
