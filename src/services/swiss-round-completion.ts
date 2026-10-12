import "server-only";

import { and, eq } from "drizzle-orm";
import { type Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { type SectionLetter } from "@/model/participants";

/**
 * Board statuses that count a playable board as resolved for the purpose of
 * drawing the next round. A match-level void / mismatch ruling (on
 * `matches.ruling`) also resolves a board even when its status is none of these
 * — callers get that for free (the completion check ORs in `ruling != null`).
 */
export type CompleteStatus =
  | "CONFIRMED"
  | "OVERRIDDEN"
  | "CANCELLED"
  | "REMOVED_TEAMS"
  | "SIT_OUT";

interface RoundCompletionOptions {
  /**
   * The statuses that mark a board resolved. Pairs and teams share
   * CONFIRMED / OVERRIDDEN / CANCELLED / REMOVED_TEAMS; teams additionally
   * treats a SIT_OUT (bye) board as resolved, whereas pairs excludes its
   * SIT_OUT / HALF_AVERAGE boards from the playable set entirely (see
   * `ignoreStatuses`).
   */
  completeStatuses: readonly CompleteStatus[];
  /**
   * Statuses to drop BEFORE the completeness check — scorer-resolved boards no
   * player ever submits (a Swiss Pairs bye's SIT_OUT, or a "2 half matches"
   * HALF_AVERAGE compensation block). Excluding them means a round made up only
   * of such boards has no playable boards and so is "not complete" (nothing to
   * score from), matching the pairs behaviour. Teams passes none, counting a
   * bye-only round as complete via a SIT_OUT `completeStatus` instead.
   */
  ignoreStatuses?: readonly string[];
}

/**
 * Whether a round is safe to draw the NEXT round from: every playable board for
 * `(section, roundNumber)` has a final result (a {@link CompleteStatus}) or a
 * match-level ruling. An empty round (no playable boards) is never "complete" —
 * there is nothing to score from.
 *
 * The pairs and teams draw services differ only in which statuses are ignored
 * vs. counted as complete, so they pass {@link RoundCompletionOptions} and
 * share this one query + predicate. Each board is joined to its match so a
 * voided / mismatched match (whose ruling lives on `matches.ruling`, not the
 * board) counts as resolved even if its boards were never played.
 */
export async function isSwissRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
  { completeStatuses, ignoreStatuses = [] }: RoundCompletionOptions,
): Promise<boolean> {
  const rows = await db
    .select({ status: boards.status, ruling: matches.ruling })
    .from(boards)
    .innerJoin(matches, eq(boards.matchId, matches.id))
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    );

  const ignore = new Set<string>(ignoreStatuses);
  const complete = new Set<string>(completeStatuses);

  // A null status is neither ignored nor complete: it stays in the playable
  // set and (unless its match carries a ruling) keeps the round incomplete,
  // matching the original per-service equality checks.
  const playable = rows.filter((r) => r.status == null || !ignore.has(r.status));
  if (playable.length === 0) return false;

  return playable.every(
    (r) => (r.status != null && complete.has(r.status)) || r.ruling != null,
  );
}
