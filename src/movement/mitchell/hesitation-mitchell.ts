import { MitchellMovementSpec, wrapValue } from "./mitchell-utils";
import {
  buildPivotLayout,
  layoutToTables,
  Station,
  SeatOccupant,
} from "./hesitation-utils";
import { Tables } from "../../model/movement";

export interface HesitationMitchellMovementSpec extends MitchellMovementSpec {
  hesitation: true;
}

/**
 * Hesitation Mitchell movement.
 *
 * A one-winner movement that squeezes one extra round out of a Mitchell. The
 * North/South pair at the last table is replaced by a pivot: moving pairs, after
 * playing East/West at the last table, play one round North/South at that same
 * (pivot) table before rejoining East/West at table 1 — they "hesitate" for a
 * round.
 *
 * - Tables: T. Stationary NS pairs at tables 1..T-1. Table T is the pivot.
 * - Rounds / board sets: T+1.
 * - Moving pairs: T+1 (the T East/West-origin pairs plus the pair that starts
 *   North/South at the pivot), circulating
 *     EW1 -> EW2 -> ... -> EW(T) -> NS(pivot) -> EW1.
 * - Arrow switching (this is inherently a one-winner movement): all tables
 *   except the pivot are switched for the final `arrowSwitchRounds` rounds.
 *
 * Board sets (T+1 of them) are assigned by anchoring each round's boards to the
 * moving pair present at the table, so every pair — moving or stationary — plays
 * all T+1 sets exactly once over the T+1 rounds and never replays a set. The
 * physical relay position the reference describes (a single relay half way for
 * an odd table count, a double relay plus table-1/last sharing for an even
 * count) is a logistics detail that does not change the board numbers we emit.
 */
export function generateHesitationMitchell(
  spec: HesitationMitchellMovementSpec,
): Tables<"PAIR"> {
  const { tables, boardsPerRound, arrowSwitchRounds = 0 } = spec;

  validateHesitationMitchellSpec(spec);

  const rounds = tables + 1;
  const boardSets = tables + 1;
  const pivot = tables;

  // Stationary NS pairs at tables 1..T-1 (block numbering: pair == table).
  const stationaryNs = new Map<number, number>();
  for (let t = 1; t < tables; t++) {
    stationaryNs.set(t, t);
  }

  // Moving ring, ordered so that advancing one station per round moves an EW
  // pair UP one physical table each round:
  // EW(1) -> EW(2) -> ... -> EW(T) -> NS(pivot) -> back to EW(1).
  const stations: Station[] = [];
  for (let t = 1; t <= tables; t++) {
    stations.push({ table: t, direction: "EW" });
  }
  stations.push({ table: pivot, direction: "NS" });

  // Round-1 identity: EW at table t = pair t + tables; pivot NS = pair `pivot`.
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
    pivotTables: new Set([pivot]),
  });

  // Assign the T+1 board sets using the canonical Hesitation Mitchell relay
  // layout (per the EBU movement notes): boards move down one table each round
  // through a slot ring that includes the relay position(s). For an odd table
  // count a single relay sits half way; for an even table count there is a
  // double relay and table 1 shares its boards with the last table.
  const slotForTable = buildHesitationSlots(tables, boardSets);
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
 * Map each table (1..T) to its 0-based slot in the board ring, following the
 * canonical Hesitation Mitchell relay layout. The board set a table plays in
 * round r is wrapValue(slot + r, boardSets), i.e. round 1 = slot + 1 and boards
 * then move down one table per round.
 *
 * Odd T (single relay half way):
 *   slots = [T1 .. T(h), RELAY, T(h+1) .. T(T)] where h = (T-1)/2.
 *
 * Even T (double relay, table 1 and last share):
 *   slots = [T1 .. T(T/2), RELAY, RELAY, T(T/2+1) .. T(T-1)] and table T shares
 *   table 1's slot (they play the same boards each round).
 */
function buildHesitationSlots(
  tables: number,
  boardSets: number,
): Record<number, number> {
  const slots: Record<number, number> = {};

  if (tables % 2 === 1) {
    const relaySlot = (tables - 1) / 2;
    let slot = 0;
    for (let t = 1; t <= tables; t++) {
      if (slot === relaySlot) {
        slot++; // skip the relay slot
      }
      slots[t] = slot;
      slot++;
    }
    return slots;
  }

  // Even table count.
  const half = tables / 2;
  for (let t = 1; t <= half; t++) {
    slots[t] = t - 1;
  }
  // Two relay slots at `half` and `half + 1`.
  for (let t = half + 1; t <= tables - 1; t++) {
    slots[t] = t + 1; // shifted by the two relay slots
  }
  // The last table shares table 1's boards (same slot).
  slots[tables] = slots[1];

  // Sanity: the highest non-shared slot must be boardSets - 1.
  void boardSets;

  return slots;
}

function validateHesitationMitchellSpec(
  spec: HesitationMitchellMovementSpec,
): void {
  const { tables, boardsPerRound } = spec;

  if (!Number.isInteger(tables) || tables < 3) {
    throw new Error("Hesitation Mitchell requires at least 3 tables");
  }

  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }
}
