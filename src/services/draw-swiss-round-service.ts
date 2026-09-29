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
  evaluateSwissSeating,
  serializeAdvisoryInputs,
  swissPairHomeSeat,
  swissPairIds,
  type SerializableAdvisoryInputs,
  type SwissDrawInput,
  type SwissHomeSeat,
  type SwissPairId,
  type SwissSeating,
} from "@/movement/swiss/swiss-pairing";
import {
  resolveSwissSeatingNames,
  type NamedSeating,
} from "@/services/swiss-seating-names";
import type { SectionLetter } from "@/model/participants";

/**
 * Why a Swiss draw could not proceed. Surfaced to the director so the "Draw
 * next round" control can explain the block.
 */
export type DrawSwissRejection =
  | "NOT_SWISS"
  | "ROUND_INCOMPLETE"
  | "EVENT_COMPLETE";

/**
 * A previewed (but NOT committed) Swiss draw: the proposed seating with stable
 * pair ids, the raw pair-id seating for the client to edit and echo back on
 * commit, resolved player names for display, the sit-out pair, and the advisory
 * flags. Nothing is written to the DB by a preview.
 */
export type PreviewSwissResult =
  | {
      ok: true;
      roundNumber: number;
      tables: number;
      seating: SwissSeating[];
      sitOutPairId: SwissPairId | null;
      named: NamedSeating;
      /**
       * The event history the advisories are computed against, in a
       * JSON-serializable form, so the director's device can re-run the SAME
       * pure advisory check (evaluateSwissSeating) locally after each edit —
       * no round-trip, identical logic to the server's initial draw.
       */
      advisoryInputs: SerializableAdvisoryInputs;
      hadUnavoidableRepeat: boolean;
      hadStationaryConflict: boolean;
    }
  | { ok: false; reason: DrawSwissRejection };

// SerializableAdvisoryInputs and its (de)serializers live in the framework-free
// swiss-pairing module so the client can import them without pulling in this
// server-only service; re-export the type for existing importers.
export type { SerializableAdvisoryInputs };

/** Outcome of committing a (possibly director-edited) Swiss seating. */
export type CommitSwissResult =
  | { ok: true; roundNumber: number }
  | { ok: false; reason: DrawSwissRejection | "INVALID_SEATING" };

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

/** Everything needed to draw or validate the next round, once preconditions pass. */
interface DrawContext {
  db: Db;
  tables: number;
  boardsPerRound: number;
  nextRound: number;
  input: SwissDrawInput;
}

/**
 * Resolve and validate the preconditions for drawing the next Swiss round, and
 * assemble the pure-engine input from current standings + history. Returns a
 * rejection reason when the section isn't Swiss, the event is complete, or the
 * current round isn't fully scored — so both preview and commit reject cleanly
 * and identically.
 */
async function resolveDrawContext(
  gameId: string,
  section: SectionLetter,
): Promise<DrawContext | { reason: DrawSwissRejection }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const selected = await getSectionMovement(db, section);
  if (!selected || selected.source !== "SWISS") {
    return { reason: "NOT_SWISS" };
  }

  const { tables, rounds: totalRounds, boardsPerRound, stationaryPairs } =
    selected.swiss;

  const history = await getSwissBoardHistory(db, section, tables);
  const currentRound = history.highestRound;

  // The event is done once the last round has been materialized.
  if (currentRound >= totalRounds) {
    return { reason: "EVENT_COMPLETE" };
  }

  // The current round must be fully scored before drawing the next.
  if (currentRound >= 1 && !(await isRoundComplete(db, section, currentRound))) {
    return { reason: "ROUND_INCOMPLETE" };
  }

  const standings = await rankedStandings(db, gameId, section, tables);

  const stationary = new Map<SwissPairId, SwissHomeSeat>();
  for (const pairId of stationaryPairs ?? []) {
    stationary.set(pairId, swissPairHomeSeat(tables, pairId));
  }

  return {
    db,
    tables,
    boardsPerRound,
    nextRound: currentRound + 1,
    input: {
      tables,
      standings,
      playedOpponents: history.playedOpponents,
      hadBye: history.hadBye,
      directionCounts: history.directionCounts,
      stationary,
    },
  };
}

/**
 * Compute (but do NOT commit) the next Swiss round for a section.
 *
 * Runs the same preconditions as the commit, draws from current standings +
 * history, and resolves player names so the director can review the proposed
 * seating before accepting it. Nothing is written to the DB and nothing is
 * broadcast — this is a read-only preview the director can then edit and commit
 * (or cancel). Since the current round is fully scored (a precondition),
 * standings are stable, so the preview matches what a subsequent commit of the
 * unedited seating would produce.
 */
export async function previewNextSwissRound(
  gameId: string,
  section: SectionLetter,
): Promise<PreviewSwissResult> {
  const ctx = await resolveDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  const draw = drawSwissRound(ctx.input);
  const named = await resolveSwissSeatingNames(
    ctx.db,
    section,
    ctx.tables,
    draw.seating,
    draw.sitOutPairId,
  );

  return {
    ok: true,
    roundNumber: ctx.nextRound,
    tables: ctx.tables,
    seating: draw.seating,
    sitOutPairId: draw.sitOutPairId,
    named,
    advisoryInputs: serializeAdvisoryInputs(ctx.input),
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
    hadStationaryConflict: draw.hadStationaryConflict,
  };
}



/**
 * Commit a (possibly director-edited) Swiss seating as the next round.
 *
 * The caller passes the EXACT seating to materialize — which may differ from a
 * fresh draw because the director swapped pairs or reassigned the bye on the
 * preview. Re-checks the same preconditions (so a stale commit can't slip a
 * round in after the event moved on), then validates that the seating is
 * STRUCTURALLY sound for this field (every pair seated once, tables unique).
 * Advisory issues (a repeat pairing, a stationary conflict, a bye repeat) are
 * deliberately NOT blocked — a director override may create them on purpose.
 *
 * It does NOT advance the timer; it only makes the next round's boards exist.
 * The caller broadcasts the resulting live updates.
 */
export async function commitNextSwissRound(
  gameId: string,
  section: SectionLetter,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
): Promise<CommitSwissResult> {
  const ctx = await resolveDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  // Block only STRUCTURAL invalidity (a pair double-booked or missing, a table
  // used twice); advisories are the director's call and are allowed through.
  const advisories = evaluateSwissSeating(seating, sitOutPairId, ctx.input);
  if (advisories.structuralError) {
    return { ok: false, reason: "INVALID_SEATING" };
  }

  await materializeSwissRound(
    gameId,
    section,
    ctx.tables,
    ctx.nextRound,
    ctx.boardsPerRound,
    seating,
    sitOutPairId,
  );

  return { ok: true, roundNumber: ctx.nextRound };
}
