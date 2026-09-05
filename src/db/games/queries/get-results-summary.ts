import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";

export interface ResultsSummary {
  /** Number of boards that can be played (every board except sit-outs). */
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
 * A board is "playable" when it is not a SIT_OUT. It is "finalized" once it has
 * a confirmed or director-overridden result — equivalently a status of
 * CONFIRMED or OVERRIDDEN. Boards still NOT_PLAYED, PENDING_CONFIRMATION, or
 * with no status yet count as outstanding.
 *
 * `allResultsIn` is true only when there is at least one playable board and all
 * of them are finalized, which is the signal used to enable USEBIO export.
 */
export async function getResultsSummary(db: Db): Promise<ResultsSummary> {
  const rows = await db
    .select({ status: boards.status })
    .from(boards);

  const playable = rows.filter((r) => r.status !== "SIT_OUT");
  const finalized = playable.filter(
    (r) => r.status === "CONFIRMED" || r.status === "OVERRIDDEN",
  );

  const totalPlayable = playable.length;
  const finalizedCount = finalized.length;

  return {
    totalPlayable,
    finalized: finalizedCount,
    allResultsIn: totalPlayable > 0 && finalizedCount === totalPlayable,
  };
}
