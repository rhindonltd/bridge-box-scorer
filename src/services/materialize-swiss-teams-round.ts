import "server-only";

import { getDb } from "@/db/games";
import { boards, NewBoard } from "@/db/games/tables/boards";
import { assignments, Assignment } from "@/db/games/tables/assignments";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import {
  buildSectionRows,
  type MaterializableMovement,
} from "@/services/materialize-movement";
import {
  swissHalfMatchBoardSplit,
  swissRoundBoardRange,
  type BoardSpan,
} from "@/services/materialize-swiss-round";
import {
  expandTeamMatches,
  expandTeamTriple,
  type TeamsMatch,
  type TeamsTriple,
  type TripleBoardSet,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import type { MaterializableTable } from "@/services/materialize-movement";

/**
 * A stable per-section seed for the Swiss Teams round-1 random draw. Derived
 * from the gameId + section so a re-materialization of round 1 (e.g. a retried
 * start) reproduces the same pairing, and different sections draw independently.
 */
export function swissTeamsRoundOneSeed(
  gameId: string,
  section: SectionLetter,
): number {
  const input = `${gameId}|${section}`;
  // FNV-1a 32-bit: small, deterministic, dependency-free.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The section-UNqualified movement id for a team's home pair (NS) at table T:
 * "${T}NS". `buildSectionRows` prefixes the section later. A team's away pair
 * (EW) at its home table T is "${T}EW". These match the ids `findTeams`/the
 * schedule join on (the section-qualified home seat).
 */
function homePairId(tableNumber: number): string {
  return `${tableNumber}NS`;
}

function awayPairId(tableNumber: number): string {
  return `${tableNumber}EW`;
}

/**
 * Phantom opponent id for a bye team's sit-out row. Not a valid seat, so the
 * board-history reader and match reconstruction never treat it as a real
 * opponent — matching the Swiss Pairs sit-out convention.
 */
const TEAMS_BYE_PHANTOM = "PHANTOM";

/**
 * The board span each of a triple's three sets (A, B, C) occupies, for a triple
 * whose FIRST round is `firstRound` in an N-round event with `boardsPerRound`
 * boards per round.
 *
 * Both SHORT and LONG triples use the SAME three-set layout (x-y on A, y-z on B,
 * z-x on C); they differ only in set size:
 *   - **SHORT** (one round): A/B are the round's two halves
 *     (`swissHalfMatchBoardSplit` — the odd board is dropped), each `halfSize`
 *     boards; C is a fresh `halfSize` set.
 *   - **LONG** (two rounds R, R+1): A is round R's FULL range, B is round R+1's
 *     FULL range, each `boardsPerRound` boards; C is a fresh `boardsPerRound`
 *     set.
 * In both cases A and B occupy the room's normal round ranges (the boards the
 * rest of the room plays), and **C continues from where the room leaves off** —
 * the first board number beyond every normal round (`N*boardsPerRound + 1`), so
 * no one else ever plays it. Every triple shares the SAME C band: two triples
 * can reuse C's board numbers because their teams are disjoint, so no pair ever
 * plays a C board twice.
 *
 * Returns `null` when a SHORT round is too short to split into two halves (fewer
 * than one board per half); the caller then has no valid short triple.
 */
export function tripleBoardSets(
  kind: "SHORT" | "LONG",
  firstRound: number,
  boardsPerRound: number,
  totalRounds: number,
): Record<TripleBoardSet, BoardSpan> | null {
  // C always begins just past every normal round's boards. Every triple shares
  // this band (disjoint teams ⇒ no pair plays a C board twice).
  const cStart = totalRounds * boardsPerRound + 1;

  if (kind === "LONG") {
    const a = swissRoundBoardRange(firstRound, boardsPerRound);
    const b = swissRoundBoardRange(firstRound + 1, boardsPerRound);
    return {
      A: { start: a.boardStart, end: a.boardEnd },
      B: { start: b.boardStart, end: b.boardEnd },
      C: { start: cStart, end: cStart + boardsPerRound - 1 },
    };
  }

  const split = swissHalfMatchBoardSplit(firstRound, boardsPerRound);
  if (!split) return null;
  const { halfOne, halfTwo, halfSize } = split;
  return {
    A: halfOne,
    B: halfTwo,
    C: { start: cStart, end: cStart + halfSize - 1 },
  };
}

/**
 * Lay the triple rows that belong to ONE round slot (`roundNumber`).
 *
 * A triple is a round-robin of three head-to-head comparisons across three
 * disjoint board sets A/B/C (x-y on A, y-z on B, z-x on C). `expandTeamTriple`
 * gives each comparison two rooms — `rows[0]` (the "half 1" room) and `rows[1]`
 * (the "half 2" room) — both on the SAME set, so each comparison is a clean
 * same-boards two-room match. Board NUMBERS come from the set (NOT the round):
 * both rooms of a comparison carry its set's board numbers.
 *
 * - A **SHORT** triple plays all six rows in its single round, so this emits
 *   both rooms of every comparison.
 * - A **LONG** triple plays the half-1 rooms in round R and the half-2 rooms in
 *   round R+1. This call is made ONCE PER SLOT (the draw/commit runs round R and
 *   round R+1 separately), so it emits only that slot's three rooms:
 *     - slot 1 (round R, `triple.slot !== 2`): each comparison's `rows[0]`.
 *     - slot 2 (round R+1, `triple.slot === 2`): each comparison's `rows[1]`.
 *   Set A/B/C numbers are keyed to the triple's FIRST round (R = `roundNumber`
 *   for slot 1, `roundNumber - 1` for slot 2).
 *
 * Returns an empty array when a SHORT round is too short to split (no valid
 * short triple), leaving the caller to surface the misconfiguration elsewhere.
 */
function tripleTables(
  triple: TeamsTriple,
  roundNumber: number,
  boardsPerRound: number,
  totalRounds: number,
): MaterializableTable[] {
  const kind = triple.kind === "LONG" ? "LONG" : "SHORT";
  const isSecondSlot = kind === "LONG" && triple.slot === 2;
  const firstRound = isSecondSlot ? roundNumber - 1 : roundNumber;

  const sets = tripleBoardSets(kind, firstRound, boardsPerRound, totalRounds);
  if (!sets) return [];

  // SHORT emits both rooms of each comparison this round; LONG emits only the
  // slot's room (room 0 in slot 1, room 1 in slot 2).
  const roomIndices: Array<0 | 1> =
    kind === "SHORT" ? [0, 1] : isSecondSlot ? [1] : [0];

  // A home table hosts its NS pair against two opponents on two DIFFERENT sets
  // (e.g. x hosts y on A and z on C), so a table can carry two round-entries —
  // merge rows by table number into one MaterializableTable (like the Swiss
  // Pairs half-match anchor table) rather than emitting duplicate table objects.
  const byTable = new Map<number, MaterializableTable>();
  for (const comparison of expandTeamTriple(triple)) {
    const span = sets[comparison.boardSet];
    for (const roomIndex of roomIndices) {
      const row = comparison.rows[roomIndex];
      const entry = byTable.get(row.tableNumber) ?? {
        tableNumber: row.tableNumber,
        rounds: [],
      };
      entry.rounds.push({
        roundNumber,
        ns: homePairId(row.nsTeam),
        ew: awayPairId(row.ewTeam),
        boardStart: span.start,
        boardEnd: span.end,
      });
      byTable.set(row.tableNumber, entry);
    }
  }
  return [...byTable.values()];
}

/**
 * Turn a drawn Swiss Teams round into the {@link MaterializableMovement} shape.
 *
 * Each team match becomes two physical tables (open room + closed room) that
 * play the same boards. At a table hosting team H against team A:
 *   - NS is H's home pair (id "${H}NS", which never leaves its home table),
 *   - EW is A's away pair (id "${A}EW", which travels here from A's home table).
 * So every pair keeps its stable id all event; only the away pair's table
 * changes round to round.
 *
 * An odd field carries either a `byeTeamId` (one team sits out) or a `triple`
 * (three teams play a three-way), never both. A triple is a round-robin of
 * three head-to-head comparisons (x-y on A, y-z on B, z-x on C), each a proper
 * same-boards two-room match (see {@link tripleTables}):
 *   - A SHORT triple fits in this one round: A/B are the round's two halves and
 *     C a fresh half-sized set, laid out as six table-rows.
 *   - A LONG triple spreads over two consecutive rounds on FULL sets: A = round
 *     R's range, B = round R+1's range, C a fresh full set. THIS call emits only
 *     the slot (`triple.slot`) belonging to `roundNumber` — three rooms, each on
 *     its set's board numbers.
 *
 * `totalRounds` is the event's declared round count, needed only to place a
 * triple's set C beyond every normal round's boards.
 */
export function swissTeamsRoundToMaterializable(
  roundNumber: number,
  boardsPerRound: number,
  totalRounds: number,
  matches: TeamsMatch[],
  byeTeamId: number | null = null,
  triple: TeamsTriple | null = null,
): MaterializableMovement {
  const { boardStart, boardEnd } = swissRoundBoardRange(
    roundNumber,
    boardsPerRound,
  );

  const tablesOut: MaterializableMovement = expandTeamMatches(matches).map(
    (placement) => ({
      tableNumber: placement.tableNumber,
      rounds: [
        {
          roundNumber,
          ns: homePairId(placement.nsTeam),
          ew: awayPairId(placement.ewTeam),
          boardStart,
          boardEnd,
        },
      ],
    }),
  );

  // Odd field (triple): a round-robin of three head-to-head comparisons across
  // three disjoint board sets A/B/C. SHORT packs all six rows into this round;
  // LONG emits only this round slot's three rooms (see {@link tripleTables}).
  if (triple != null) {
    tablesOut.push(
      ...tripleTables(triple, roundNumber, boardsPerRound, totalRounds),
    );
  }

  // Odd field: the bye team sits at its own home table (its home pair on NS,
  // a phantom opponent on EW) with the round's boards flagged SIT_OUT, so the
  // boards are never played/scored and the bye is recoverable from history.
  if (byeTeamId != null) {
    tablesOut.push({
      tableNumber: byeTeamId,
      rounds: [
        {
          roundNumber,
          ns: homePairId(byeTeamId),
          ew: TEAMS_BYE_PHANTOM,
          boardStart,
          boardEnd,
          sitOut: true,
        },
      ],
    });
  }

  return tablesOut.sort((x, y) => x.tableNumber - y.tableNumber);
}

/**
 * Append a single Swiss Teams round's boards (and, for round 1, the seat
 * assignments) to a game's database in one transaction. Idempotent per round:
 * if the round already has boards, nothing is written (so a retried draw or
 * start can't duplicate a round). Mirrors {@link materializeSwissRound}.
 */
export async function materializeSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
  roundNumber: number,
  boardsPerRound: number,
  totalRounds: number,
  matches: TeamsMatch[],
  byeTeamId: number | null = null,
  triple: TeamsTriple | null = null,
): Promise<{ written: boolean }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .where(and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)))
    .limit(1);

  if (existing.length > 0) {
    return { written: false };
  }

  const movement = swissTeamsRoundToMaterializable(
    roundNumber,
    boardsPerRound,
    totalRounds,
    matches,
    byeTeamId,
    triple,
  );

  const { boardRows, assignmentRows } = buildSectionRows(section, movement);

  insertRows(db, boardRows, assignmentRows);

  return { written: true };
}

/** Insert board and assignment rows in a single transaction. */
function insertRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  boardRows: NewBoard[],
  assignmentRows: Assignment[],
): void {
  db.transaction((tx) => {
    if (boardRows.length > 0) {
      tx.insert(boards).values(boardRows).run();
    }
    if (assignmentRows.length > 0) {
      tx.insert(assignments).values(assignmentRows).run();
    }
  });
}
