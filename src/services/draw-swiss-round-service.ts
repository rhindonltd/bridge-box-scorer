import "server-only";

import { getDb, type Db } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import {
  getSwissBoardHistory,
  swissPairIdFromParticipant,
} from "@/db/games/queries/swiss-board-history";
import { materializeSwissRound } from "@/services/materialize-swiss-round";
import {
  drawSwissRound,
  swissPairHomeSeat,
  swissPairIds,
  type SwissDrawInput,
  type SwissHomeSeat,
  type SwissPairId,
} from "@/movement/swiss/swiss-pairing";
import type { SectionLetter } from "@/model/participants";

/**
 * Why a Swiss draw could not proceed. Surfaced to the director so the "Draw
 * next round" control can explain the block.
 */
export type DrawSwissRejection =
  | "NOT_SWISS"
  | "ROUND_INCOMPLETE"
  | "EVENT_COMPLETE";

/** Outcome of a Swiss draw attempt: either the drawn round, or a rejection. */
export type DrawSwissResult =
  | {
      ok: true;
      roundNumber: number;
      sitOutPairId: SwissPairId | null;
      hadUnavoidableRepeat: boolean;
      hadStationaryConflict: boolean;
    }
  | { ok: false; reason: DrawSwissRejection };

/**
 * Whether every playable board in a given round has a final result, so the
 * round is safe to draw from. A board is playable when it is not a SIT_OUT;
 * final means CONFIRMED or OVERRIDDEN. An empty round (no playable boards) is
 * not "complete" — there is nothing to score from.
 */
async function isRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<boolean> {
  const { boards } = await import("@/db/games/tables/boards");
  const { and, eq } = await import("drizzle-orm");

  const rows = await db
    .select({ status: boards.status })
    .from(boards)
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    );

  const playable = rows.filter((r) => r.status !== "SIT_OUT");
  if (playable.length === 0) return false;
  return playable.every(
    (r) => r.status === "CONFIRMED" || r.status === "OVERRIDDEN",
  );
}

/**
 * Build the ranked standings (best pair first) as stable Swiss pair ids from
 * the section leaderboard. The leaderboard's overall lines are keyed by the
 * pair's participant id (its round-1 home seat), already ranked; map each back
 * to its integer pair id. Any pair that has not appeared on the leaderboard yet
 * (e.g. only sat out so far) is appended at the end in id order so the field is
 * always complete.
 */
async function rankedStandings(
  db: Db,
  gameId: string,
  section: SectionLetter,
  tables: number,
): Promise<SwissPairId[]> {
  const sections = await computeSectionLeaderboards(db, gameId);
  const sectionBoard = sections.find((s) => s.section === section);

  const ordered: SwissPairId[] = [];
  const seen = new Set<SwissPairId>();

  if (sectionBoard) {
    // overallScore.lines are already ranked best-first.
    for (const line of sectionBoard.overallScore.lines as {
      pairId: string;
    }[]) {
      const id = swissPairIdFromParticipant(line.pairId, tables);
      if (id != null && !seen.has(id)) {
        ordered.push(id);
        seen.add(id);
      }
    }
  }

  // Append any pairs not yet ranked (no scored boards), lowest priority.
  for (const id of swissPairIds(tables)) {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }

  return ordered;
}

/**
 * Draw and materialize the next Swiss round for a section.
 *
 * Preconditions checked here (so the caller can reject cleanly): the section is
 * a Swiss movement, the current (highest materialized) round is fully scored,
 * and the event has rounds remaining. When all hold, this computes the next
 * round from current standings + history (honouring no-repeat and stationary
 * pairs), materializes it, and reports the draw's advisories.
 *
 * It does NOT advance the timer — round timing stays under the director's timer
 * controls. It only makes the next round's boards exist; the caller broadcasts
 * the resulting live updates.
 */
export async function drawNextSwissRound(
  gameId: string,
  section: SectionLetter,
): Promise<DrawSwissResult> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const selected = await getSectionMovement(db, section);
  if (!selected || selected.source !== "SWISS") {
    return { ok: false, reason: "NOT_SWISS" };
  }

  const { tables, rounds: totalRounds, boardsPerRound, stationaryPairs } =
    selected.swiss;

  const history = await getSwissBoardHistory(db, section, tables);
  const currentRound = history.highestRound;

  // The event is done once the last round has been materialized.
  if (currentRound >= totalRounds) {
    return { ok: false, reason: "EVENT_COMPLETE" };
  }

  // The current round must be fully scored before drawing the next.
  if (currentRound >= 1 && !(await isRoundComplete(db, section, currentRound))) {
    return { ok: false, reason: "ROUND_INCOMPLETE" };
  }

  const standings = await rankedStandings(db, gameId, section, tables);

  const stationary = new Map<SwissPairId, SwissHomeSeat>();
  for (const pairId of stationaryPairs ?? []) {
    stationary.set(pairId, swissPairHomeSeat(tables, pairId));
  }

  const input: SwissDrawInput = {
    tables,
    standings,
    playedOpponents: history.playedOpponents,
    hadBye: history.hadBye,
    directionCounts: history.directionCounts,
    stationary,
  };

  const draw = drawSwissRound(input);
  const nextRound = currentRound + 1;

  await materializeSwissRound(
    gameId,
    section,
    tables,
    nextRound,
    boardsPerRound,
    draw.seating,
    draw.sitOutPairId,
  );

  return {
    ok: true,
    roundNumber: nextRound,
    sitOutPairId: draw.sitOutPairId,
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
    hadStationaryConflict: draw.hadStationaryConflict,
  };
}
