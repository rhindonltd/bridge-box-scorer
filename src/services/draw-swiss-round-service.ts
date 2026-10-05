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
  type SwissHalfMatchSeating,
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
import { parseSeat, type SectionLetter } from "@/model/participants";

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
 * nor a HALF_AVERAGE; final means CONFIRMED or OVERRIDDEN. An empty round (no
 * playable boards) is not "complete" — there is nothing to score from.
 *
 * SIT_OUT (a bye) and HALF_AVERAGE (a "2 half matches" compensation block for
 * the half a non-anchor misses) are both resolved by the scorer, never
 * submitted by players, so they must not count as outstanding — otherwise a
 * round containing a half-match group could never be drawn from.
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

  const playable = rows.filter(
    (r) => r.status !== "SIT_OUT" && r.status !== "HALF_AVERAGE",
  );
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
 * (e.g. only sat out so far) is appended at the end in id order.
 *
 * Only the pairs that were actually SEATED (one assignment row each) are
 * included. A Swiss event has `2*tables` positions, but an ODD field leaves one
 * position unseated — a phantom that is never a real pair. Including it would
 * pad the field to an even `2*tables` and mask the oddness, so the pure draw
 * engine's odd-field handling (bye or 2-half-matches) would never fire. We
 * therefore restrict the field to the real seated pairs, so an odd field yields
 * an odd-length `order` (`2*tables - 1`) exactly as the engine expects.
 */
/**
 * The stable Swiss pair ids actually SEATED in a section — one per real pair,
 * read from the ASSIGNMENTS table (each `id` is the pair's section-qualified
 * round-1 home seat). An odd field leaves one of the `2*tables` positions
 * unseated; that phantom position has no assignment row, so it is absent here.
 * Used to keep an odd field's `order` genuinely odd for the draw engine.
 *
 * Assignments (not participant/player rows) are the authoritative seated set:
 * they are written for every real pair when a round is materialized, so this
 * works even before player details are attached.
 */
async function seatedPairIdsForSection(
  db: Db,
  section: SectionLetter,
  tables: number,
): Promise<Set<SwissPairId>> {
  const { assignments } = await import("@/db/games/tables/assignments");
  const rows = await db.select({ id: assignments.id }).from(assignments);

  const ids = new Set<SwissPairId>();
  for (const row of rows) {
    if (row.id == null) continue;
    let parsed;
    try {
      parsed = parseSeat(row.id);
    } catch {
      continue;
    }
    if (parsed.section !== section) continue;
    const id = swissPairIdFromParticipant(row.id, tables);
    if (id != null) ids.add(id);
  }
  return ids;
}

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

  // The pairs that are actually seated in this section (one assignment per real
  // pair). The unseated position of an odd field has no pair here, so it is
  // excluded — keeping the field genuinely odd for the engine.
  const realPairIds = await seatedPairIdsForSection(db, section, tables);

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
      if (id != null && realPairIds.has(id) && !seen.has(id)) {
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

  // Append any REAL pair not yet ranked (no scored boards), lowest priority.
  // They have no leaderboard line yet, so show a zero total ranked last. The
  // phantom position of an odd field is not a real pair, so it is never added.
  const lastRank = ranked.length > 0 ? ranked[ranked.length - 1].rank : 0;
  for (const id of swissPairIds(tables)) {
    if (realPairIds.has(id) && !seen.has(id)) {
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

  const {
    tables,
    rounds: totalRounds,
    boardsPerRound,
    stationaryPairs,
    oddHandling = "BYE",
    oddRoundPlan,
  } = selected.swiss;

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

  const nextRound = currentRound + 1;

  // How THIS round resolves an odd field: the per-round plan entry when the
  // event uses half-matches (1-indexed round → 0-indexed plan), else a bye.
  const roundOddHandling =
    oddHandling === "HALF_MATCHES" &&
    (oddRoundPlan?.[nextRound - 1] ?? "BYE") === "HALF_MATCHES"
      ? "HALF_MATCHES"
      : "BYE";

  return {
    db,
    tables,
    boardsPerRound,
    nextRound,
    ranked,
    input: {
      tables,
      standings: order,
      playedOpponents: history.playedOpponents,
      hadBye: history.hadBye,
      hadHalfMatch: history.hadHalfMatch,
      oddHandling: roundOddHandling,
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
    if (!isHalfMatchCommitValid(seating, halfMatch, ctx.input)) {
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

/**
 * Structural soundness of a 2-half-matches commit: the ordinary `seating` plus
 * the group's three pairs must cover every pair in the field exactly once, on
 * distinct tables (the anchor's table must not clash with an ordinary table).
 * Advisories are not checked here (the group isn't director-editable yet).
 */
function isHalfMatchCommitValid(
  seating: SwissSeating[],
  halfMatch: SwissHalfMatchSeating,
  input: SwissDrawInput,
): boolean {
  const groupIds = [
    halfMatch.group.anchor,
    halfMatch.group.halfOneOpponent,
    halfMatch.group.halfTwoOpponent,
  ];

  const counts = new Map<SwissPairId, number>();
  for (const s of seating) {
    counts.set(s.ns, (counts.get(s.ns) ?? 0) + 1);
    counts.set(s.ew, (counts.get(s.ew) ?? 0) + 1);
  }
  for (const id of groupIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  // Every pair in the REAL field (the odd standings, 2*tables - 1) seated once.
  // Using the standings — not swissPairIds(tables) — so the phantom position of
  // the odd field isn't demanded.
  const expected = input.standings;
  if (counts.size !== expected.length) return false;
  for (const id of expected) {
    if (counts.get(id) !== 1) return false;
  }

  // Tables unique, and the anchor's table distinct from the ordinary tables.
  const tableNumbers = seating.map((s) => s.tableNumber);
  if (new Set(tableNumbers).size !== tableNumbers.length) return false;
  if (tableNumbers.includes(halfMatch.anchorTable)) return false;

  return true;
}
