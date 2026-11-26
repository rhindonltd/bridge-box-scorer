import type { MovementPlan } from "@/model/movement-plan";
import { PairDirection } from "@/model/common";
import { PairSeat, parseSeat } from "@/model/participants";
import type { SwissMovementSpec } from "@/model/selected-movement";
import { swissRoundBoardRange } from "@/modules/swiss/board-ranges";
import { swissPairIdFromSeat } from "./pair-ids";
import { swissRoundToMaterializable } from "./plan-round";
import {
  drawSwissRound,
  swissPairHomeSeat,
  swissPairIdFromHomeSeat,
  swissPairIds,
  swissRoundOne,
  type SwissHomeSeat,
  type SwissPairId,
  type SwissSeating,
} from "./swiss-pairing";

// Round 1 of a Swiss event is positional (each pair plays at the seat it sat
// down in), because there are no standings to draw from yet.

/**
 * Round 1 as a positional layout, for the start's expected-seat check: table T
 * seats pair T NS against pair tables+T EW, i.e. seats "${T}NS" and "${T}EW".
 * A pair's participant id is its round-1 home seat (unqualified); the check
 * qualifies it with the section.
 */
export function swissRoundOneLayout(
  tables: number,
  boardsPerRound: number,
): MovementPlan {
  const { boardStart, boardEnd } = swissRoundBoardRange(1, boardsPerRound);
  return swissRoundOne(tables).map((seat) => ({
    tableNumber: seat.tableNumber,
    rounds: [
      {
        roundNumber: 1,
        ns: `${seat.tableNumber}NS`,
        ew: `${seat.tableNumber}EW`,
        boardStart,
        boardEnd,
        boardCopy: "A",
      },
    ],
  }));
}

/**
 * Whether round 1 of a Swiss Pairs event is played as "2 half matches": only
 * for an odd field (one empty seat), when the event uses half-match odd
 * handling and the round-1 plan entry is a half-match round.
 */
export function swissRoundOneIsHalfMatch(
  spec: Pick<SwissMovementSpec, "oddHandling" | "oddRoundPlan">,
  oddField: boolean,
): boolean {
  const { oddHandling = "BYE", oddRoundPlan } = spec;
  return (
    oddField &&
    oddHandling === "HALF_MATCHES" &&
    (oddRoundPlan?.[0] ?? "BYE") === "HALF_MATCHES"
  );
}

/**
 * The round-1 plan of a Swiss Pairs event, given the one empty seat of an odd
 * field (or null for an even field): a half-match group when round 1 is a
 * half-match round, otherwise the positional round with the pair opposite the
 * empty seat on a bye.
 */
export function swissPairsRoundOnePlan(
  spec: SwissMovementSpec,
  sitOutSeat: PairSeat | null,
): MovementPlan {
  if (sitOutSeat !== null && swissRoundOneIsHalfMatch(spec, true)) {
    return roundOneHalfMatch(spec, sitOutSeat);
  }
  return roundOnePositional(spec.tables, spec.boardsPerRound, sitOutSeat);
}

/** One seat's stable Swiss pair id: the pair that started there. */
export interface SwissHomeAnchor {
  tableNumber: number;
  direction: PairDirection;
  pairId: SwissPairId;
}

/**
 * Every seat's stable Swiss pair id (NS seats 1..tables, EW seats
 * tables+1..2·tables). Every round writes a pair's boards under this one id
 * whatever chair it sits in, so the schedule, travellers and standings all see
 * one pair.
 */
export function swissHomeAnchors(tables: number): SwissHomeAnchor[] {
  const anchors: SwissHomeAnchor[] = [];
  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    for (const direction of ["NS", "EW"] as const) {
      anchors.push({
        tableNumber,
        direction,
        pairId: swissPairIdFromHomeSeat(tables, { tableNumber, direction }),
      });
    }
  }
  return anchors;
}

/**
 * Round 1 of a Swiss Pairs event (even field, or an odd field with a bye): each
 * pair plays at the seat it sat down in. Built by the same materializer every
 * later round uses, so round 1 carries the same stable pair ids and the same
 * match rows (a /20 match per table, a BYE for the sitting-out pair) as the
 * rounds that follow.
 *
 * In an odd field the pair opposite the empty seat has the bye. It keeps its
 * own table number (it is physically seated there), rather than being parked
 * after the played tables as a drawn round's bye is.
 */
function roundOnePositional(
  tables: number,
  boardsPerRound: number,
  sitOutSeat: PairSeat | null,
): MovementPlan {
  const byeTable =
    sitOutSeat !== null ? parseSeat(sitOutSeat).tableNumber : null;
  const byePairId =
    sitOutSeat !== null
      ? swissPairIdFromHomeSeat(tables, {
          tableNumber: byeTable!,
          // The bye pair is the one sitting opposite the empty seat.
          direction: parseSeat(sitOutSeat).direction === "NS" ? "EW" : "NS",
        })
      : null;

  const seating: SwissSeating[] = [];
  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    if (tableNumber === byeTable) continue;
    seating.push({
      tableNumber,
      ns: swissPairIdFromHomeSeat(tables, { tableNumber, direction: "NS" }),
      ew: swissPairIdFromHomeSeat(tables, { tableNumber, direction: "EW" }),
    });
  }

  const movement = swissRoundToMaterializable(
    tables,
    1,
    boardsPerRound,
    seating,
    byePairId,
  );
  if (byeTable === null) return movement;
  return movement.map((table) =>
    table.rounds.some((r) => r.sitOut)
      ? { ...table, tableNumber: byeTable }
      : table,
  );
}

/**
 * Round 1 of a 2-half-matches odd field.
 *
 * Round 1 has no standings, so the field is ordered positionally (by stable
 * pair id) over the REAL seated pairs — every `swissPairIds(tables)` id except
 * the empty seat's phantom. `drawSwissRound` with `oddHandling: "HALF_MATCHES"`
 * then chooses the three-pair group, honours a stationary anchor, and seats the
 * rest; `swissRoundToMaterializable` turns that into the round-1 board rows
 * (two halves at the anchor's table + the two HALF_AVERAGE compensation blocks).
 */
function roundOneHalfMatch(
  spec: SwissMovementSpec,
  sitOutSeat: PairSeat,
): MovementPlan {
  const { tables, boardsPerRound, stationaryPairs } = spec;

  // The phantom position is the empty seat (a physical round-1 home chair);
  // every other id is a real pair.
  const phantomId = swissPairIdFromSeat(sitOutSeat, tables);
  const standings = swissPairIds(tables).filter((id) => id !== phantomId);

  const stationary = new Map<SwissPairId, SwissHomeSeat>();
  for (const pairId of stationaryPairs ?? []) {
    stationary.set(pairId, swissPairHomeSeat(tables, pairId));
  }

  const draw = drawSwissRound({
    tables,
    standings,
    playedOpponents: new Set(),
    hadBye: new Set(),
    hadHalfMatch: new Set(),
    oddHandling: "HALF_MATCHES",
    directionCounts: new Map(),
    stationary,
  });

  // drawSwissRound always sets `halfMatch` for an odd HALF_MATCHES field of
  // >= 3 pairs (the start check rejects a smaller one).
  /* v8 ignore next 3 */
  if (draw.halfMatch == null) {
    throw new Error(
      "Expected a half-match group for a round-1 HALF_MATCHES odd field",
    );
  }

  return swissRoundToMaterializable(
    tables,
    1,
    boardsPerRound,
    draw.seating,
    null,
    {
      group: draw.halfMatch.group,
      seat: {
        tableNumber: draw.halfMatch.anchorTable,
        anchorDirection: draw.halfMatch.anchorDirection,
      },
    },
  );
}
