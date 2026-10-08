import "server-only";

import { getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import {
  buildSectionRows,
  insertSectionDrafts,
  type MaterializableMovement,
} from "@/services/materialize-movement";
import {
  swissPairHomeSeat,
  type SwissHalfMatchGroup,
  type SwissPairId,
  type SwissSeating,
} from "@/movement/swiss/swiss-pairing";
import { PairDirection } from "@/model/common";
import type {
  MaterializableRound,
  MaterializableTable,
} from "@/services/materialize-movement";

/**
 * Phantom participant id used for the empty seat on a Swiss sit-out row. It is
 * not a valid seat, so the board-history reader ignores it (only the real
 * sitting-out pair is recorded as having had a bye). Kept distinct from any
 * real pair's seat id.
 */
const SWISS_SIT_OUT_PHANTOM = "PHANTOM";

/**
 * The stable, section-UNqualified movement id for a Swiss pair: its round-1
 * home position, e.g. "1NS" or "3EW". `buildSectionRows` later prefixes the
 * section (→ "A1NS"), exactly as the Mitchell family's ids ("1NS") are treated.
 *
 * Anchoring the id to the round-1 seat — rather than a bare integer — keeps
 * Swiss consistent with every other movement, where a board's ns/ew equals the
 * seated pair's assignment id / initialSeat. That identity is what the
 * schedule, leaderboard and player screens all join on.
 */
export function swissPairMovementId(
  tables: number,
  pairId: SwissPairId,
): string {
  const home = swissPairHomeSeat(tables, pairId);
  return `${home.tableNumber}${home.direction}`;
}

/**
 * The board-number range a Swiss round plays. Rounds use fresh boards that grow
 * with the round: round R plays boards `(R-1)*boardsPerRound + 1` through
 * `R*boardsPerRound`, all tables playing the same set simultaneously.
 */
export function swissRoundBoardRange(
  roundNumber: number,
  boardsPerRound: number,
): { boardStart: number; boardEnd: number } {
  const boardStart = (roundNumber - 1) * boardsPerRound + 1;
  return { boardStart, boardEnd: boardStart + boardsPerRound - 1 };
}

/** A contiguous inclusive board-number range. */
export interface BoardSpan {
  start: number;
  end: number;
}

/**
 * Split a round's board range into the two halves of a "2 half matches" group.
 *
 * The round's `boardsPerRound` boards are split down the middle into two equal
 * halves; an ODD count rounds **down** (the final board of the round is
 * discarded for the group so each half is the same size and no pair plays a
 * board the anchor can't also play once). So a 6-board round → S1 boards 1–3,
 * S2 boards 4–6; an 8-board round → 1–4 / 5–8; a 7-board round → 1–3 / 4–6 with
 * board 7 dropped. Returns `null` when fewer than two boards would be in each
 * half (nothing to split), so the caller can fall back to a bye.
 *
 * `halfSize` is the common size of each half (`floor(boardsPerRound / 2)`).
 */
export function swissHalfMatchBoardSplit(
  roundNumber: number,
  boardsPerRound: number,
): { halfOne: BoardSpan; halfTwo: BoardSpan; halfSize: number } | null {
  const halfSize = Math.floor(boardsPerRound / 2);
  if (halfSize < 1) return null;

  const { boardStart } = swissRoundBoardRange(roundNumber, boardsPerRound);
  const halfOne: BoardSpan = {
    start: boardStart,
    end: boardStart + halfSize - 1,
  };
  const halfTwo: BoardSpan = {
    start: boardStart + halfSize,
    end: boardStart + 2 * halfSize - 1,
  };
  return { halfOne, halfTwo, halfSize };
}

/**
 * The seat the anchor occupies for the whole half-match round. The anchor stays
 * put; each non-anchor takes the opposite seat for its half (and the two
 * non-anchors swap in/out at the midpoint — Q11). Supplied by the seating layer
 * (so a stationary anchor keeps its home seat); defaults to NS when the group
 * is seated at a free table.
 */
export interface SwissHalfMatchSeat {
  tableNumber: number;
  anchorDirection: PairDirection;
}

/**
 * Materialize a "2 half matches" group into table entries for one round.
 *
 * The anchor sits `seat.anchorDirection` at `seat.tableNumber` for the whole
 * round, facing `halfOneOpponent` over the first board subset (S1) and
 * `halfTwoOpponent` over the second (S2) — two real round entries at the one
 * table (the non-anchors swap in/out at the midpoint; no phantom second table).
 * Each non-anchor is then compensated for the half it missed with a
 * HALF_AVERAGE block on those boards (`ns` = the non-anchor, `ew` = a phantom):
 * `halfOneOpponent` missed S2, `halfTwoOpponent` missed S1.
 *
 * The two real entries are grouped by their OPPONENT (distinct `ew`/`ns`), which
 * is exactly how the half-match scorer re-splits the anchor's round into its two
 * halves. The compensation blocks are parked on free table numbers above the
 * played tables so they never collide with a real table's primary key.
 *
 * Returns `null` when the round is too short to split (see
 * {@link swissHalfMatchBoardSplit}); the caller should fall back to a bye.
 */
export function swissHalfMatchToMaterializable(
  tables: number,
  roundNumber: number,
  boardsPerRound: number,
  group: SwissHalfMatchGroup,
  seat: SwissHalfMatchSeat,
  firstFreeCompensationTable: number,
): MaterializableTable[] | null {
  const split = swissHalfMatchBoardSplit(roundNumber, boardsPerRound);
  if (!split) return null;

  const anchorId = swissPairMovementId(tables, group.anchor);
  const oppOneId = swissPairMovementId(tables, group.halfOneOpponent);
  const oppTwoId = swissPairMovementId(tables, group.halfTwoOpponent);

  // All rows of this half-match group share one groupId so the group's two real
  // comparisons and the two compensation blocks are explicit sibling rows.
  const groupId = `hm|r${roundNumber}|t${seat.tableNumber}`;

  // Seat the anchor in its fixed direction; the opponent takes the opposite.
  const seatHalf = (
    opponentId: string,
    span: BoardSpan,
  ): MaterializableRound => {
    const ns = seat.anchorDirection === "NS" ? anchorId : opponentId;
    const ew = seat.anchorDirection === "NS" ? opponentId : anchorId;
    return {
      roundNumber,
      ns,
      ew,
      boardStart: span.start,
      boardEnd: span.end,
      // One of the half-match's two REAL comparisons (a /10 half pool), keyed
      // by its own board span so the anchor's two halves stay distinct rows.
      match: {
        kind: "HALF_MATCH",
        scoredAsUnit: true,
        key: `${groupId}|${span.start}-${span.end}`,
        home: ns,
        opponent: ew,
        groupId,
        vpPool: 10,
      },
    };
  };

  // Both real halves sit at the anchor's one table.
  const anchorTable: MaterializableTable = {
    tableNumber: seat.tableNumber,
    rounds: [
      seatHalf(oppOneId, split.halfOne),
      seatHalf(oppTwoId, split.halfTwo),
    ],
  };

  // Compensation blocks for each non-anchor's missed half (phantom opponent).
  const compensation = (
    nonAnchorId: string,
    missed: BoardSpan,
    tableNumber: number,
  ): MaterializableTable => ({
    tableNumber,
    rounds: [
      {
        roundNumber,
        ns: nonAnchorId,
        ew: SWISS_SIT_OUT_PHANTOM,
        boardStart: missed.start,
        boardEnd: missed.end,
        halfAverage: true,
        // The compensated (unplayed) half of a non-anchor: part of the same
        // half-match group, but a phantom opponent (no real comparison).
        match: {
          kind: "HALF_MATCH",
          scoredAsUnit: true,
          key: `${groupId}|comp|${nonAnchorId}|${missed.start}-${missed.end}`,
          home: nonAnchorId,
          opponent: null,
          groupId,
          vpPool: 10,
        },
      },
    ],
  });

  return [
    anchorTable,
    // halfOneOpponent played S1, so it is compensated on S2; and vice versa.
    compensation(oppOneId, split.halfTwo, firstFreeCompensationTable),
    compensation(oppTwoId, split.halfOne, firstFreeCompensationTable + 1),
  ];
}

/**
 * A drawn "2 half matches" group plus where its anchor is seated. The three
 * group pairs are NOT in the round's ordinary `seating`; this is materialized
 * separately (two real halves at the anchor's table + two HALF_AVERAGE
 * compensation blocks). The anchor seat is chosen by the seating layer, so a
 * stationary anchor keeps its home seat.
 */
export interface SwissHalfMatchMaterialization {
  group: SwissHalfMatchGroup;
  seat: SwissHalfMatchSeat;
}

/**
 * Turn a drawn Swiss round into the {@link MaterializableMovement} shape (one
 * "table" per seating entry, each with the single round R). Pair ids become the
 * movement participant ids (later section-qualified by buildSectionRows), so a
 * pair's stable integer id round-trips through the boards rows.
 *
 * The sit-out pair, if any, is emitted as an extra sit-out "table": it keeps the
 * pair on the NS seat with a phantom opponent and is flagged `sitOut`, so its
 * boards are written with status SIT_OUT (played by no one) and the board-history
 * reader can recover the bye.
 *
 * For a "2 half matches" round, pass `halfMatch` instead of (or alongside) a
 * sit-out: its three pairs are materialized via
 * {@link swissHalfMatchToMaterializable} and must NOT also appear in `seating`.
 * The compensation blocks are parked on table numbers above every other table
 * (played or sit-out) so they never collide.
 */
export function swissRoundToMaterializable(
  tables: number,
  roundNumber: number,
  boardsPerRound: number,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
  halfMatch: SwissHalfMatchMaterialization | null = null,
): MaterializableMovement {
  const { boardStart, boardEnd } = swissRoundBoardRange(
    roundNumber,
    boardsPerRound,
  );

  const tablesOut: MaterializableMovement = seating.map((seat) => {
    const ns = swissPairMovementId(tables, seat.ns);
    const ew = swissPairMovementId(tables, seat.ew);
    return {
      tableNumber: seat.tableNumber,
      rounds: [
        {
          roundNumber,
          ns,
          ew,
          boardStart,
          boardEnd,
          // An ordinary Swiss Pairs table-round is a full /20 match scored as a
          // unit (its per-round VP), keyed by its (round, table).
          match: {
            kind: "PAIRS",
            scoredAsUnit: true,
            key: `${roundNumber}|t${seat.tableNumber}`,
            home: ns,
            opponent: ew,
            vpPool: 20,
          },
        },
      ],
    };
  });

  // Highest table number used so far by a played table (for parking phantom /
  // compensation tables above it without a primary-key collision).
  const maxPlayedTable = seating.reduce(
    (max, s) => Math.max(max, s.tableNumber),
    0,
  );

  if (sitOutPairId != null) {
    // Park the sit-out on the next free table number so it doesn't collide with
    // a played table's PK. The board rows are flagged sitOut.
    const sitOutNs = swissPairMovementId(tables, sitOutPairId);
    tablesOut.push({
      tableNumber: maxPlayedTable + 1,
      rounds: [
        {
          roundNumber,
          ns: sitOutNs,
          ew: SWISS_SIT_OUT_PHANTOM,
          boardStart,
          boardEnd,
          sitOut: true,
          // A bye: one participant, no opponent, scored as a unit (an average
          // VP credit for the round).
          match: {
            kind: "BYE",
            scoredAsUnit: true,
            key: `${roundNumber}|bye|${sitOutNs}`,
            home: sitOutNs,
            opponent: null,
          },
        },
      ],
    });
  }

  if (halfMatch != null) {
    // Park the two compensation blocks above every other table used this round
    // (played tables, the anchor's table, and any sit-out table).
    const firstFreeCompensationTable =
      Math.max(maxPlayedTable, halfMatch.seat.tableNumber, sitOutPairId != null ? maxPlayedTable + 1 : 0) + 1;

    const halfMatchTables = swissHalfMatchToMaterializable(
      tables,
      roundNumber,
      boardsPerRound,
      halfMatch.group,
      halfMatch.seat,
      firstFreeCompensationTable,
    );
    if (halfMatchTables == null) {
      throw new Error(
        `Round ${roundNumber} has too few boards (${boardsPerRound}) to split into two half matches`,
      );
    }
    tablesOut.push(...halfMatchTables);
  }

  return tablesOut;
}

/**
 * Append a single Swiss round's boards (and, for round 1, the seat assignments)
 * to a game's database, in one transaction.
 *
 * This is the incremental counterpart to the up-front materialization used by
 * static movements: Swiss draws one round at a time, so only that round's rows
 * are written. It is idempotent per round — if the round already has boards
 * (e.g. a retried draw), nothing is written and the call is a no-op — so a
 * double draw can't duplicate a round.
 *
 * Assignments are only meaningful for round 1 (they seed the initial seat map
 * consumed elsewhere); `buildSectionRows` already restricts assignment rows to
 * round 1, so later rounds contribute board rows only.
 */
export async function materializeSwissRound(
  gameId: string,
  section: SectionLetter,
  tables: number,
  roundNumber: number,
  boardsPerRound: number,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
  halfMatch: SwissHalfMatchMaterialization | null = null,
): Promise<{ written: boolean }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  // Idempotency guard: bail if this round already has any board row.
  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .where(and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)))
    .limit(1);

  if (existing.length > 0) {
    return { written: false };
  }

  const movement = swissRoundToMaterializable(
    tables,
    roundNumber,
    boardsPerRound,
    seating,
    sitOutPairId,
    halfMatch,
  );

  const { boardRows, matchRows, assignmentRows } = buildSectionRows(
    section,
    movement,
  );

  insertSectionDrafts(db, matchRows, boardRows, assignmentRows);

  return { written: true };
}
