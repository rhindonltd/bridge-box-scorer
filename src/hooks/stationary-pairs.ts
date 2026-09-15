"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { GameType } from "@/db/games/types/game-type";
import type {
  SelectedMovement,
  SwissMovementSpec,
} from "@/model/selected-movement";
import { swissPairHomeSeat } from "@/movement/swiss/swiss-pairing";
import type { MovementByTable } from "@/movement/movementData";
import { generatedToMovementByTable } from "@/movement/movementData";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import {
  buildTablePlacement,
  withRelay,
  type TablePlacement,
} from "@/movement/table-placement";

/** Which directions of a table stay put for the whole movement. */
export interface StationaryDirections {
  ns: boolean;
  ew: boolean;
}

/**
 * The resolved setup facts for a section's selected movement, keyed by table
 * number, plus the movement's own table count.
 *
 * When the section's table count does not match the movement's table count the
 * `stationary` and `placement` maps are BOTH empty: the movement no longer
 * describes the room as laid out, so showing per-table facts against the wrong
 * table count would mislead the director. `movementTables` still reports what
 * the movement expects so callers can explain the mismatch if they wish.
 */
export interface MovementResolution {
  stationary: Map<number, StationaryDirections>;
  placement: Map<number, TablePlacement>;
  /** The movement's table count, or 0 when no movement is resolved. */
  movementTables: number;
}

type MovementDetailResult = {
  type: GameType;
  tables: MovementByTable[];
};

/** True when `label` is defined and identical across every round. */
function isConstant(labels: (string | undefined)[]): boolean {
  if (labels.length === 0) return false;
  const first = labels[0];
  if (first == null) return false;
  return labels.every((l) => l === first);
}

/**
 * Build the stationary map from per-table rounds: a direction is stationary
 * when its pair label is the same in every round for that table.
 */
function stationaryFromTables(
  tables: {
    tableNumber: number;
    rounds: { ns?: string; ew?: string }[];
  }[],
): Map<number, StationaryDirections> {
  const map = new Map<number, StationaryDirections>();
  for (const table of tables) {
    map.set(table.tableNumber, {
      ns: isConstant(table.rounds.map((r) => r.ns)),
      ew: isConstant(table.rounds.map((r) => r.ew)),
    });
  }
  return map;
}

const EMPTY: MovementResolution = {
  stationary: new Map(),
  placement: new Map(),
  movementTables: 0,
};

/**
 * Resolve a Swiss selection into per-table setup facts. Stationary directions
 * come from the director's designated pairs (each pair id maps to a round-1
 * home table + direction); round-1 board placement is boards `1..boardsPerRound`
 * at every table (all tables play the same set). Gated on the Swiss table count
 * matching the section, like the other movements.
 */
function swissResolution(
  swiss: SwissMovementSpec,
  sectionTables: number,
): MovementResolution {
  const movementTables = swiss.tables;
  if (movementTables !== sectionTables) {
    return { stationary: new Map(), placement: new Map(), movementTables };
  }

  const stationary = new Map<number, StationaryDirections>();
  for (let t = 1; t <= movementTables; t++) {
    stationary.set(t, { ns: false, ew: false });
  }
  for (const pairId of swiss.stationaryPairs ?? []) {
    const home = swissPairHomeSeat(movementTables, pairId);
    const dirs = stationary.get(home.tableNumber);
    if (dirs) {
      if (home.direction === "NS") dirs.ns = true;
      else dirs.ew = true;
    }
  }

  const placement = new Map<number, TablePlacement>();
  for (let t = 1; t <= movementTables; t++) {
    placement.set(t, { boardStart: 1, boardEnd: swiss.boardsPerRound });
  }

  return { stationary, placement, movementTables };
}

/**
 * Resolve a section's selected movement into per-table setup facts: stationary
 * pair positions and board placement (round-1 boards, physical copy, and any
 * share/relay), keyed by table number.
 *
 * - `MITCHELL` selections are generated locally (no fetch).
 * - `SPEC` selections are fetched from the movement detail endpoint.
 *
 * Everything is gated on the movement's table count matching `sectionTables`:
 * on a mismatch (e.g. the director resized the section away from the movement's
 * size) both maps are empty. Returns empty maps when no movement is selected or
 * while a SPEC lookup is loading/errored, so callers can treat "not present" as
 * "no information".
 */
export function useMovementResolution(
  selectedMovement: SelectedMovement | null,
  gameType: GameType,
  sectionTables: number,
): MovementResolution {
  const isSpec = selectedMovement?.source === "SPEC";

  const { data } = useSWR<MovementDetailResult>(
    isSpec ? swrKeys.movementDetail(gameType, selectedMovement.specId) : null,
    fetcher,
  );

  if (!selectedMovement) {
    return EMPTY;
  }

  // Swiss: stationary positions are the director's designated pairs (not
  // derived from a schedule, which doesn't exist up front). Round-1 boards are
  // the same set at every table. Both are computed directly from the selection.
  if (selectedMovement.source === "SWISS") {
    return swissResolution(selectedMovement.swiss, sectionTables);
  }

  let tables: MovementByTable[];
  let shareAndRelay = false;

  if (selectedMovement.source === "MITCHELL") {
    try {
      tables = generatedToMovementByTable(
        generateMitchell(selectedMovement.mitchell),
      );
      shareAndRelay = selectedMovement.mitchell.shareAndRelay === true;
    } catch {
      return EMPTY;
    }
  } else {
    // SPEC: computed from the fetched detail (empty until it loads). Seeded
    // specs never carry a provable relay, so shareAndRelay stays false.
    if (!data) {
      return EMPTY;
    }
    tables = data.tables;
  }

  const movementTables = tables.length;

  // Table-count gate: the movement must describe exactly this many tables, or
  // its per-table facts don't line up with the room as laid out.
  if (movementTables !== sectionTables) {
    return { stationary: new Map(), placement: new Map(), movementTables };
  }

  const placement = withRelay(buildTablePlacement(tables), {
    shareAndRelay,
    tables: movementTables,
  });

  return {
    stationary: stationaryFromTables(tables),
    placement,
    movementTables,
  };
}
