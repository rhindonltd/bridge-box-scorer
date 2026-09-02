import { boardsForSet } from "./mitchell-utils";
import { Table, Tables } from "../../model/movement";

/**
 * Shared machinery for the pivot-based ("hesitation") one-winner Mitchell
 * family: the Hesitation and Double Hesitation Mitchell generators.
 *
 * These movements differ from a plain Mitchell because a *moving* pair does not
 * stay East/West for the whole session. At one or more "pivot" tables a moving
 * pair sits North/South for a single "hesitation" round before rejoining the
 * East/West circulation. This mixes the North/South and East/West fields, which
 * is why the family is inherently one-winner and normally arrow-switched.
 *
 * Pair identity follows the existing block numbering used elsewhere in the
 * Mitchell generators (see getPairIds): the pair that starts North/South at
 * table t is pair `t`; the pair that starts East/West at table t is pair
 * `t + tables`. A pair keeps that number for the whole session regardless of
 * where it later sits, so travellers stay coherent.
 */

/** A physical seat at a table for one round. */
export type Direction = "NS" | "EW";

export interface SeatOccupant {
  /** The movement-wide pair number occupying this seat (block numbering). */
  pair: number;
  /**
   * The pair's *starting* direction. Used to decide arrow switching, which
   * only makes sense relative to a pair's origin, not its current seat.
   */
  origin: Direction;
  /**
   * For a moving pair, the 0-based index of its home station in the circulation
   * ring (i.e. where it starts in round 1). Stationary NS pairs have `null`.
   * Exposed so generators can reason about a pair by its origin if needed.
   */
  originStation: number | null;
}

/**
 * The stations a moving pair visits, in order, expressed as the position it
 * occupies each round. A "position" is a (table, direction) seat. The moving
 * pairs form a single ring: the pair at position i in round r is at position
 * i+1 (mod ringLength) in round r+1.
 */
export interface Station {
  table: number;
  direction: Direction;
}

/**
 * A resolved movement layout: for every (table, round) the NS and EW occupants.
 * Board sets are attached separately by the caller since board handling
 * (relays / sharing) differs between movements.
 */
export interface HesitationLayout {
  tables: number;
  rounds: number;
  /** occupants[tableIndex][roundIndex] = { ns, ew } */
  seatByTableRound: { ns: SeatOccupant; ew: SeatOccupant }[][];
}

/**
 * Place the moving pairs onto the station ring for every round.
 *
 * There are `stations.length` moving pairs. In round 1 the pair whose *origin*
 * is `stations[i]` occupies `stations[i]`. Each subsequent round every moving
 * pair advances one station along the ring. This yields, for each round, a map
 * from station index to the pair number that starts there.
 *
 * @param stations   the circulation ring
 * @param rounds     number of rounds (must equal stations.length for a full
 *                   single-cycle movement)
 * @param pairForStation  maps a station to the block pair number that *starts*
 *                   at that station's seat in round 1
 * @returns occupantByStationRound[stationIndex][roundIndex] = SeatOccupant
 */
export function circulateMovingPairs(
  stations: Station[],
  rounds: number,
  pairForStation: (station: Station) => Omit<SeatOccupant, "originStation">,
): SeatOccupant[][] {
  const ringLength = stations.length;

  // The occupant that *starts* at each station (round 1 identity), stamped with
  // its home station index so board assignment can key off it.
  const startingOccupant = stations.map((s, idx) => ({
    ...pairForStation(s),
    originStation: idx,
  }));

  const occupantByStationRound: SeatOccupant[][] = stations.map(() =>
    new Array<SeatOccupant>(rounds),
  );

  for (let stationIdx = 0; stationIdx < ringLength; stationIdx++) {
    for (let roundIdx = 0; roundIdx < rounds; roundIdx++) {
      // The pair now at `stationIdx` started `roundIdx` stations earlier in the
      // ring (it has advanced `roundIdx` steps to get here).
      const originStation =
        ((stationIdx - roundIdx) % ringLength + ringLength) % ringLength;
      occupantByStationRound[stationIdx][roundIdx] =
        startingOccupant[originStation];
    }
  }

  return occupantByStationRound;
}

/**
 * Apply an arrow switch to a resolved (table, round) occupant pair.
 *
 * Arrow switching swaps which pair number is recorded as North/South and which
 * as East/West for a given board, so that the two competing fields are mixed.
 * We express it by swapping the occupant records; the caller decides which
 * (table, round) cells are switched (all non-pivot tables for the final N
 * rounds, in the standard scheme).
 */
export function arrowSwitchSeat(seat: {
  ns: SeatOccupant;
  ew: SeatOccupant;
}): { ns: SeatOccupant; ew: SeatOccupant } {
  return { ns: seat.ew, ew: seat.ns };
}

/**
 * Convert a resolved layout plus a precomputed board-set matrix
 * (`boardSetByTableRound[tableIndex][roundIndex]`, produced by each generator's
 * canonical relay slot layout) into the Tables<"PAIR"> shape. Pair numbers are
 * stringified to match the one-winner numbering used across the Mitchell
 * generators.
 */
export function layoutToTables(
  layout: HesitationLayout,
  boardsPerRound: number,
  boardSetByTableRound: number[][],
): Tables<"PAIR"> {
  const result: Table<"PAIR">[] = [];

  for (let t = 0; t < layout.tables; t++) {
    const tableNumber = t + 1;
    const rounds = [];

    for (let r = 0; r < layout.rounds; r++) {
      const roundNumber = r + 1;
      const seat = layout.seatByTableRound[t][r];
      const boardSet = boardSetByTableRound[t][r];

      rounds.push({
        round: roundNumber,
        boards: boardsForSet(boardSet, boardsPerRound),
        participants: {
          nsId: `${seat.ns.pair}`,
          ewId: `${seat.ew.pair}`,
        },
      });
    }

    result.push({ table: tableNumber, rounds });
  }

  return { tables: result };
}


/**
 * Build the complete per-(table, round) seat map for a pivot-based movement.
 *
 * Inputs:
 * - `tables`, `rounds`
 * - `stationaryNs[tableNumber]` = the pair number that sits North/South at that
 *   table for the whole session (non-pivot tables). Pivot tables are omitted.
 * - `stations` = the moving ring (see circulateMovingPairs). Each station is a
 *   seat that the moving pairs rotate through, including the pivot NS seats.
 * - `pairForStation` = round-1 identity for each station.
 * - `arrowSwitchRounds` = number of trailing rounds to arrow switch.
 * - `pivotTables` = set of table numbers that are pivots (never arrow switched).
 *
 * The result places, for every (table, round): the stationary NS pair (or the
 * moving pair currently occupying the pivot NS seat) and the moving EW pair,
 * then applies arrow switching to non-pivot tables in the final rounds.
 */
export function buildPivotLayout(params: {
  tables: number;
  rounds: number;
  stationaryNs: Map<number, number>;
  stations: Station[];
  pairForStation: (station: Station) => Omit<SeatOccupant, "originStation">;
  arrowSwitchRounds: number;
  pivotTables: Set<number>;
}): HesitationLayout {
  const {
    tables,
    rounds,
    stationaryNs,
    stations,
    pairForStation,
    arrowSwitchRounds,
    pivotTables,
  } = params;

  const occupantByStationRound = circulateMovingPairs(
    stations,
    rounds,
    pairForStation,
  );

  // Index the moving occupant for a (table, direction, round) lookup.
  const movingAt = new Map<string, SeatOccupant>();
  stations.forEach((station, stationIdx) => {
    for (let r = 0; r < rounds; r++) {
      movingAt.set(
        seatKey(station.table, station.direction, r),
        occupantByStationRound[stationIdx][r],
      );
    }
  });

  const arrowSwitchFrom = rounds - arrowSwitchRounds + 1;

  const seatByTableRound: { ns: SeatOccupant; ew: SeatOccupant }[][] = [];

  for (let t = 0; t < tables; t++) {
    const tableNumber = t + 1;
    const tableRounds: { ns: SeatOccupant; ew: SeatOccupant }[] = [];

    for (let r = 0; r < rounds; r++) {
      const roundNumber = r + 1;

      // North/South: either the stationary pair, or (at a pivot NS seat) the
      // moving pair currently hesitating there.
      const nsMoving = movingAt.get(seatKey(tableNumber, "NS", r));
      const stationaryPair = stationaryNs.get(tableNumber);

      const ns: SeatOccupant =
        nsMoving ??
        (stationaryPair !== undefined
          ? { pair: stationaryPair, origin: "NS", originStation: null }
          : unreachableSeat(tableNumber, roundNumber, "NS"));

      // East/West: the moving pair currently at this table's EW seat.
      const ewMoving = movingAt.get(seatKey(tableNumber, "EW", r));
      const ew: SeatOccupant =
        ewMoving ?? unreachableSeat(tableNumber, roundNumber, "EW");

      const seat = { ns, ew };

      const isPivot = pivotTables.has(tableNumber);
      const shouldSwitch =
        arrowSwitchRounds > 0 && roundNumber >= arrowSwitchFrom && !isPivot;

      tableRounds.push(shouldSwitch ? arrowSwitchSeat(seat) : seat);
    }

    seatByTableRound.push(tableRounds);
  }

  return { tables, rounds, seatByTableRound };
}

function seatKey(table: number, direction: Direction, roundIdx: number): string {
  return `${table}:${direction}:${roundIdx}`;
}

function unreachableSeat(
  table: number,
  round: number,
  direction: Direction,
): never {
  throw new Error(
    `No pair resolved for table ${table} round ${round} ${direction}; ` +
      `the circulation ring does not cover this seat.`,
  );
}
