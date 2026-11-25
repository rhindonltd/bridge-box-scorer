import { PHANTOM_SEAT } from "@/model/phantom-seat";
import { PairDirection } from "@/model/common";
import type {
  MovementPlan,
  PlannedRound,
  PlannedTable,
} from "@/model/movement-plan";
import {
  type SwissHalfMatchGroup,
  type SwissPairId,
  type SwissSeating,
} from "@/modules/swiss/pairs/swiss-pairing";
import { swissPairMovementId } from "@/modules/swiss/pairs/pair-ids";
import {
  swissHalfMatchBoardSplit,
  swissRoundBoardRange,
  type BoardSpan,
} from "@/modules/swiss/board-ranges";

/**
 * Turning a drawn Swiss Pairs round (ordinary tables, a bye, or a "2 half
 * matches" group) into the movement plan the core writes.
 */

/**
 * Phantom participant id for the empty seat on a Swiss sit-out / HALF_AVERAGE
 * row. Re-exported local alias of the shared {@link PHANTOM_SEAT}.
 */
const SWISS_SIT_OUT_PHANTOM = PHANTOM_SEAT;

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
): PlannedTable[] | null {
  const split = swissHalfMatchBoardSplit(roundNumber, boardsPerRound);
  if (!split) return null;

  const anchorId = swissPairMovementId(tables, group.anchor);
  const oppOneId = swissPairMovementId(tables, group.halfOneOpponent);
  const oppTwoId = swissPairMovementId(tables, group.halfTwoOpponent);

  // All rows of this half-match group share one groupId so the group's two real
  // comparisons and the two compensation blocks are explicit sibling rows.
  const groupId = `hm|r${roundNumber}|t${seat.tableNumber}`;

  // Seat the anchor in its fixed direction; the opponent takes the opposite.
  const seatHalf = (opponentId: string, span: BoardSpan): PlannedRound => {
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
  const anchorTable: PlannedTable = {
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
  ): PlannedTable => ({
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
 * Turn a drawn Swiss round into the {@link MovementPlan} shape (one
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
): MovementPlan {
  const { boardStart, boardEnd } = swissRoundBoardRange(
    roundNumber,
    boardsPerRound,
  );

  const tablesOut: MovementPlan = seating.map((seat) => {
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
      Math.max(
        maxPlayedTable,
        halfMatch.seat.tableNumber,
        sitOutPairId != null ? maxPlayedTable + 1 : 0,
      ) + 1;

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
