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
 * Supported for an EVEN number of tables from six upwards (the well-defined
 * case given in the reference, e.g. six tables playing eight 3-board rounds for
 * 24 boards). A four-table Double Hesitation is degenerate (a pair would meet an
 * opponent twice) and odd table counts use a different, ambiguous relay scheme
 * in the source, so both are rejected rather than emitting an unverified
 * movement.
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
 * Map each table (1..T) to its 0-based slot in the T+2 board ring for an even
 * table count.
 *
 * Per the reference the two relays sit (1) just after the half-way point — the
 * slot after table T/2+1 — and (2) between the last table and table 1 (a
 * trailing relay). So the ring is:
 *   [T1 .. T(T/2+1), RELAY, T(T/2+2) .. T(T), RELAY]
 *
 * Boards move down one table per round, so a table with slot p plays
 * wrapValue(p + r, T+2) in round r. For T=6 this gives the EBU layout
 * (T1..T4 in slots 0..3, relay, T5,T6 in slots 5,6, trailing relay).
 */
function buildDoubleHesitationSlots(tables: number): Record<number, number> {
  const slots: Record<number, number> = {};
  const beforeRelay = tables / 2 + 1;

  for (let t = 1; t <= beforeRelay; t++) {
    slots[t] = t - 1;
  }
  // Relay slot at index `beforeRelay`.
  for (let t = beforeRelay + 1; t <= tables; t++) {
    slots[t] = t; // shifted by one to leave the relay slot
  }
  // Trailing relay slot at index (T+1).

  return slots;
}

function validateDoubleHesitationSpec(
  spec: DoubleHesitationMitchellMovementSpec,
): void {
  const { tables, boardsPerRound } = spec;

  if (!Number.isInteger(tables) || tables < 6) {
    throw new Error("Double Hesitation Mitchell requires at least 6 tables");
  }

  if (tables % 2 !== 0) {
    throw new Error(
      "Double Hesitation Mitchell is only supported for an even number of tables",
    );
  }

  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }
}
