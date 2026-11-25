import "server-only";

import { getDb, type Db } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import { isSwissRoundComplete } from "@/services/swiss-round-completion";
import { getSwissBoardHistory } from "@/db/games/queries/swiss-board-history";
import { materializeSwissRound } from "@/services/materialize-swiss-round";
import {
  drawSwissRound,
  evaluateSwissSeating,
  isValidHalfMatchCommit,
  pairsDrawInput,
  seatedSwissPairIds,
  serializeAdvisoryInputs,
  swissPairMovementId,
  swissPairsField,
  type RankedSwissPair,
  type SerializableAdvisoryInputs,
  type SwissDrawInput,
  type SwissHalfMatchSeating,
  type SwissPairId,
  type SwissSeating,
  type SwissStandingEntry,
} from "@/modules/swiss";
import type { NamedSeating } from "@/model/swiss-seating";
import { resolveSwissSeatingNames } from "@/services/swiss-seating-names";
import { buildAssignmentPlayerLookup } from "@/db/games/queries/assignment-players";
import type { SectionLetter } from "@/model/participants";

/**
 * Why a Swiss draw could not proceed. Surfaced to the director so the "Draw
 * next round" control can explain the block.
 */
export type DrawSwissRejection =
  "NOT_SWISS" | "ROUND_INCOMPLETE" | "EVENT_COMPLETE";

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
      /**
       * The drawn 2-half-matches group for this round, or null for a bye/even
       * round. Its three pairs are not in `seating`; the director reviews it
       * read-only on the preview and echoes it back on commit.
       */
      halfMatch: SwissHalfMatchSeating | null;
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
 * round is safe to draw from. A board is playable when it is neither a SIT_OUT
 * nor a HALF_AVERAGE; final means CONFIRMED, OVERRIDDEN, or CANCELLED (a fouled
 * board carrying its §3.3.2 adjusted score). An empty round (no playable
 * boards) is not "complete" — there is nothing to score from.
 *
 * SIT_OUT (a bye) and HALF_AVERAGE (a "2 half matches" compensation block for
 * the half a non-anchor misses) are both resolved by the scorer, never
 * submitted by players, so they must not count as outstanding — otherwise a
 * round containing a half-match group could never be drawn from.
 */
function isRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<boolean> {
  // Pairs: a bye's SIT_OUT and a "2 half matches" HALF_AVERAGE block are
  // scorer-resolved and never submitted, so they are dropped from the playable
  // set rather than counted — a round of only those has nothing to draw from.
  return isSwissRoundComplete(db, section, roundNumber, {
    completeStatuses: ["CONFIRMED", "OVERRIDDEN", "CANCELLED", "REMOVED_TEAMS"],
    ignoreStatuses: ["SIT_OUT", "HALF_AVERAGE"],
  });
}

/**
 * The stable Swiss pair ids actually SEATED in a section, read from the
 * `seat_occupancy` table (`seatedSwissPairIds`). Occupancies are the
 * authoritative seated set: one is written for every real pair when the
 * director seats it (pre-start), before the first round is drawn.
 */
async function seatedPairIdsForSection(
  db: Db,
  section: SectionLetter,
  tables: number,
): Promise<Set<SwissPairId>> {
  const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
  const rows = await db
    .select({ seat: seatOccupancy.seat })
    .from(seatOccupancy);
  return seatedSwissPairIds(
    rows.map((r) => r.seat),
    section,
    tables,
  );
}

/**
 * The field in draw order (best pair first), from the section standings and
 * the seated pairs (`swissPairsField`).
 */
async function rankedStandings(
  db: Db,
  gameId: string,
  section: SectionLetter,
  tables: number,
): Promise<{ order: SwissPairId[]; ranked: RankedSwissPair[] }> {
  const sections = await computeSectionLeaderboards(db, gameId);
  // The pairs that are actually seated in this section (one assignment per real
  // pair). The unseated position of an odd field has no pair here, so it is
  // excluded — keeping the field genuinely odd for the engine.
  const realPairIds = await seatedPairIdsForSection(db, section, tables);
  return swissPairsField(
    sections.find((s) => s.section === section),
    realPairIds,
    tables,
  );
}

/** Everything needed to draw or validate the next round, once preconditions pass. */
interface DrawContext {
  db: Db;
  tables: number;
  boardsPerRound: number;
  nextRound: number;
  input: SwissDrawInput;
  /** Current standings (best first) with running totals, for the preview. */
  ranked: RankedSwissPair[];
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

  const { tables, rounds: totalRounds, boardsPerRound } = selected.swiss;

  const history = await getSwissBoardHistory(db, section, tables);
  const currentRound = history.highestRound;

  // The event is done once the last round has been materialized.
  if (currentRound >= totalRounds) {
    return { reason: "EVENT_COMPLETE" };
  }

  // The current round must be fully scored before drawing the next.
  if (
    currentRound >= 1 &&
    !(await isRoundComplete(db, section, currentRound))
  ) {
    return { reason: "ROUND_INCOMPLETE" };
  }

  const { order, ranked } = await rankedStandings(db, gameId, section, tables);

  const nextRound = currentRound + 1;

  return {
    db,
    tables,
    boardsPerRound,
    nextRound,
    ranked,
    input: pairsDrawInput(selected.swiss, nextRound, order, history),
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
    draw.halfMatch,
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
    halfMatch: draw.halfMatch,
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
  ranked: RankedSwissPair[],
): Promise<SwissStandingEntry[]> {
  const lookup = await buildAssignmentPlayerLookup(db);

  return ranked.map((r) => {
    const players = lookup.get(
      `${section}${swissPairMovementId(tables, r.id)}`,
    );
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
  halfMatch: SwissHalfMatchSeating | null = null,
): Promise<CommitSwissResult> {
  const ctx = await resolveDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  if (halfMatch != null) {
    // A 2-half-matches round: the group's three pairs are NOT in `seating`.
    // Validate structural soundness treating the group as covering those three
    // pairs, then materialize the ordinary tables plus the group.
    if (!isValidHalfMatchCommit(seating, halfMatch, ctx.input)) {
      return { ok: false, reason: "INVALID_SEATING" };
    }

    await materializeSwissRound(
      gameId,
      section,
      ctx.tables,
      ctx.nextRound,
      ctx.boardsPerRound,
      seating,
      null,
      {
        group: halfMatch.group,
        seat: {
          tableNumber: halfMatch.anchorTable,
          anchorDirection: halfMatch.anchorDirection,
        },
      },
    );

    return { ok: true, roundNumber: ctx.nextRound };
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
