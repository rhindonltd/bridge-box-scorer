import { MitchellMovementSpec, wrapValue } from "./mitchell-utils";
import {
  buildPivotLayout,
  layoutToTables,
  Station,
  SeatOccupant,
} from "./hesitation-utils";
import { Tables } from "../../model/movement";

export interface DoubleHesitationMitchellMovementSpec
  extends MitchellMovementSpec {
  doubleHesitation: true;
  /**
   * Modified Double Hesitation: table 2 is played with a permanent arrow switch
   * for the whole session, which balances the movement slightly better for some
   * table counts. Changes the moving-pair circulation order.
   */
  modified?: boolean;
}

/**
 * Double Hesitation Mitchell movement.
 *
 * Like a Hesitation Mitchell but with TWO pivot tables (table 2 and the last
 * table), adding two rounds instead of one. For T tables it plays T+2 rounds
 * and needs T+2 board sets. It is a one-winner movement, so all tables except
 * the two pivots are arrow switched on the final rounds.
 *
 * Circulation (standard), per the EBU movement notes:
 *   EW1 -> EW2 -> ... -> EW(T) -> NS2 -> NS(T) -> back to EW1
 *
 * Modified circulation (table 2 permanently arrow switched):
 *   EW1 -> NS2 -> EW3 -> ... -> EW(T) -> EW2 -> NS(T) -> back to EW1
 *
 * Board layout (canonical, boards move down one table each round): the T+2 sets
 * sit on a slot ring of the T tables plus two relay slots — one after table
 * T-2 and one after the last table. Board set at a table with ring slot p in
 * round r is wrapValue(p + r, T+2). This reproduces the EBU 6-table example
 * exactly (T1=1-3, T2=4-6, T3=7-9, T4=10-12, relay 13-15, T5=16-18, T6=19-21,
 * relay 22-24).
 *
 * Supported for any number of tables from five upwards. Even and odd table
 * counts share the same circulation ring (EW1..EW(T), NS2, NS(T)) and differ
 * only in the board-set relay layout: even counts use one mid relay plus a
 * trailing relay, odd counts use a doubled mid relay and no trailing relay (see
 * buildDoubleHesitationSlots). A four-table Double Hesitation is degenerate (a
 * pair would meet an opponent twice) and is rejected. The `modified`
 * circulation variant remains even-only.
 */
export function generateDoubleHesitationMitchell(
  spec: DoubleHesitationMitchellMovementSpec,
): Tables<"PAIR"> {
  const { tables, boardsPerRound, arrowSwitchRounds = 0, modified = false } =
    spec;

  validateDoubleHesitationSpec(spec);

  const rounds = tables + 2;
  const boardSets = tables + 2;
  const firstPivot = 2;
  const lastPivot = tables;

  // Stationary NS pairs at every table except the two pivots.
  const stationaryNs = new Map<number, number>();
  for (let t = 1; t <= tables; t++) {
    if (t === firstPivot || t === lastPivot) continue;
    stationaryNs.set(t, t);
  }

  const stations = modified
    ? buildModifiedStations(tables)
    : buildStandardStations(tables);

  // Round-1 identity: EW at table t = pair t + tables; a pivot NS seat's round-1
  // occupant is that table's NS-origin pair (pair == table).
  const pairForStation = (
    s: Station,
  ): Omit<SeatOccupant, "originStation"> =>
    s.direction === "EW"
      ? { pair: s.table + tables, origin: "EW" }
      : { pair: s.table, origin: "NS" };

  const layout = buildPivotLayout({
    tables,
    rounds,
    stationaryNs,
    stations,
    pairForStation,
    arrowSwitchRounds,
    pivotTables: new Set([firstPivot, lastPivot]),
  });

  const slotForTable = buildDoubleHesitationSlots(tables);
  const boardSetByTableRound: number[][] = [];
  for (let t = 1; t <= tables; t++) {
    const slot = slotForTable[t];
    const row: number[] = [];
    for (let r = 1; r <= rounds; r++) {
      row.push(wrapValue(slot + r, boardSets));
    }
    boardSetByTableRound.push(row);
  }

  return layoutToTables(layout, boardsPerRound, boardSetByTableRound);
}

/**
 * Standard circulation ring:
 *   EW1 -> EW2 -> ... -> EW(T) -> NS2 -> NS(T) -> EW1
 */
function buildStandardStations(tables: number): Station[] {
  const stations: Station[] = [];
  for (let t = 1; t <= tables; t++) {
    stations.push({ table: t, direction: "EW" });
  }
  stations.push({ table: 2, direction: "NS" });
  stations.push({ table: tables, direction: "NS" });
  return stations;
}

/**
 * Modified circulation ring (table 2 permanently arrow switched):
 *   EW1 -> NS2 -> EW3 -> ... -> EW(T) -> EW2 -> NS(T) -> EW1
 *
 * Table 2's EW seat is visited late in the ring; its NS (pivot) seat is visited
 * right after table 1.
 */
function buildModifiedStations(tables: number): Station[] {
  const stations: Station[] = [];
  stations.push({ table: 1, direction: "EW" });
  stations.push({ table: 2, direction: "NS" });
  for (let t = 3; t <= tables; t++) {
    stations.push({ table: t, direction: "EW" });
  }
  stations.push({ table: 2, direction: "EW" });
  stations.push({ table: tables, direction: "NS" });
  return stations;
}

/**
 * Map each table (1..T) to its 0-based slot in the T+2 board ring. Boards move
 * down one table per round, so a table with slot p plays wrapValue(p + r, T+2)
 * in round r. There are always T+2 slots (T tables + two relay slots); the two
 * relays are positioned differently for even and odd table counts.
 *
 * Even T (per the reference): one relay just after the half-way point (the slot
 * after table T/2+1) and one trailing relay between the last table and table 1:
 *   [T1 .. T(T/2+1), RELAY, T(T/2+2) .. T(T), RELAY]
 * For T=6 this is the EBU layout (T1..T4 slots 0..3, relay, T5,T6 slots 5,6,
 * trailing relay).
 *
 * Odd T (per the reference): there is NO relay between the last table and table
 * 1; instead one relay is doubled at the half-way point. So the two relay slots
 * sit together after the first (T+1)/2 tables and there is no trailing relay:
 *   [T1 .. T((T+1)/2), RELAY, RELAY, T((T+1)/2 + 1) .. T(T)]
 * For T=7 this gives T1..T4 slots 0..3, doubled relay at slots 4,5, T5,T6,T7 at
 * slots 6,7,8 (verified against [M49]); for T=5, T1..T3 slots 0..2, doubled
 * relay at slots 3,4, T4,T5 at slots 5,6 (verified against [MS5]).
 */
function buildDoubleHesitationSlots(tables: number): Record<number, number> {
  const slots: Record<number, number> = {};

  if (tables % 2 === 0) {
    const beforeRelay = tables / 2 + 1;
    for (let t = 1; t <= beforeRelay; t++) {
      slots[t] = t - 1;
    }
    // Single relay slot at index `beforeRelay`.
    for (let t = beforeRelay + 1; t <= tables; t++) {
      slots[t] = t; // shifted by one to leave the relay slot
    }
    // Trailing relay slot at index (T+1).
    return slots;
  }

  // Odd table count: doubled relay at the half-way point, no trailing relay.
  const beforeRelay = (tables + 1) / 2;
  for (let t = 1; t <= beforeRelay; t++) {
    slots[t] = t - 1;
  }
  // Two relay slots at indices `beforeRelay` and `beforeRelay + 1`.
  for (let t = beforeRelay + 1; t <= tables; t++) {
    slots[t] = t + 1; // shifted by two to leave the doubled relay
  }

  return slots;
}

function validateDoubleHesitationSpec(
  spec: DoubleHesitationMitchellMovementSpec,
): void {
  const { tables, boardsPerRound, modified } = spec;

  if (!Number.isInteger(tables) || tables < 5) {
    throw new Error("Double Hesitation Mitchell requires at least 5 tables");
  }

  // A four-table Double Hesitation is degenerate (a pair would meet an opponent
  // twice); five upwards is well defined. Odd and even table counts differ only
  // in their board-set relay layout (see buildDoubleHesitationSlots).

  if (tables % 2 !== 0 && modified) {
    // The modified circulation is only defined for the even-table case.
    throw new Error(
      "Modified Double Hesitation Mitchell is only supported for an even number of tables",
    );
  }

  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }
}
