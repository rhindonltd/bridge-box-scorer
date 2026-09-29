import "server-only";

import { getDb, type Db } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import {
  getSwissBoardHistory,
  swissPairIdFromParticipant,
} from "@/db/games/queries/swiss-board-history";
import {
  materializeSwissRound,
  swissPairMovementId,
} from "@/services/materialize-swiss-round";
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
import type { SwissStandingEntry } from "@/movement/swiss/swiss-standings";
import {
  resolveSwissSeatingNames,
  type NamedSeating,
} from "@/services/swiss-seating-names";
import { buildAssignmentPlayerLookup } from "@/db/games/queries/assignment-players";
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
      /**
       * Current standings (best first) with each pair's running VP total — the
       * order the draw ranked the field on. Shown on the preview so the
       * director can see the draw pairs close-ranked pairs.
       */
      standings: SwissStandingEntry[];
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
/** A ranked standings line for a pair, before names are resolved. */
interface RankedPair {
  id: SwissPairId;
  total: number;
  rank: number;
  tied: boolean;
}

async function rankedStandings(
  db: Db,
  gameId: string,
  section: SectionLetter,
  tables: number,
): Promise<{ order: SwissPairId[]; ranked: RankedPair[] }> {
  const sections = await computeSectionLeaderboards(db, gameId);
  const sectionBoard = sections.find((s) => s.section === section);

  const order: SwissPairId[] = [];
  const ranked: RankedPair[] = [];
  const seen = new Set<SwissPairId>();

  if (sectionBoard) {
    // overallScore.lines are already ranked best-first, and (for Swiss) carry
    // the running VP total the field is ranked on plus its rank/tie flags.
    for (const line of sectionBoard.overallScore.lines as {
      pairId: string;
      totalVP?: number;
      rank?: number;
      tied?: boolean;
    }[]) {
      const id = swissPairIdFromParticipant(line.pairId, tables);
      if (id != null && !seen.has(id)) {
        order.push(id);
        ranked.push({
          id,
          total: line.totalVP ?? 0,
          rank: line.rank ?? order.length,
          tied: line.tied ?? false,
        });
        seen.add(id);
      }
    }
  }

  // Append any pairs not yet ranked (no scored boards), lowest priority. They
  // have no leaderboard line yet, so show a zero total ranked last.
  const lastRank = ranked.length > 0 ? ranked[ranked.length - 1].rank : 0;
  for (const id of swissPairIds(tables)) {
    if (!seen.has(id)) {
      order.push(id);
      ranked.push({ id, total: 0, rank: lastRank + 1, tied: false });
      seen.add(id);
    }
  }

  return { order, ranked };
}

/** Everything needed to draw or validate the next round, once preconditions pass. */
interface DrawContext {
  db: Db;
  tables: number;
  boardsPerRound: number;
  nextRound: number;
  input: SwissDrawInput;
  /** Current standings (best first) with running totals, for the preview. */
  ranked: RankedPair[];
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

  const { order, ranked } = await rankedStandings(db, gameId, section, tables);

  const stationary = new Map<SwissPairId, SwissHomeSeat>();
  for (const pairId of stationaryPairs ?? []) {
    stationary.set(pairId, swissPairHomeSeat(tables, pairId));
  }

  return {
    db,
    tables,
    boardsPerRound,
    nextRound: currentRound + 1,
    ranked,
    input: {
      tables,
      standings: order,
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
  const standings = await buildPairStandings(
    ctx.db,
    section,
    ctx.tables,
    ctx.ranked,
  );

  return {
    ok: true,
    roundNumber: ctx.nextRound,
    tables: ctx.tables,
    seating: draw.seating,
    sitOutPairId: draw.sitOutPairId,
    named,
    advisoryInputs: serializeAdvisoryInputs(ctx.input),
    standings,
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
    hadStationaryConflict: draw.hadStationaryConflict,
  };
}

/**
 * Resolve the ranked standings into display entries with pair names, in the
 * order the draw ranked the field. Names come from the same assignment→players
 * lookup the seating resolver uses, keyed by each pair's section-qualified
 * home seat, so a pair's label matches its seating-card label.
 */
async function buildPairStandings(
  db: Db,
  section: SectionLetter,
  tables: number,
  ranked: RankedPair[],
): Promise<SwissStandingEntry[]> {
  const lookup = await buildAssignmentPlayerLookup(db);

  return ranked.map((r) => {
    const players = lookup.get(`${section}${swissPairMovementId(tables, r.id)}`);
    const name = players
      ? `${players.player1.firstName} ${players.player1.lastName} / ${players.player2.firstName} ${players.player2.lastName}`
      : `Pair ${r.id}`;
    return { id: r.id, name, total: r.total, rank: r.rank, tied: r.tied };
  });
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
