import type { MovementByTable } from "./movementData";
import {
  buildTablePlacement,
  withRelay,
  type TablePlacement,
} from "./table-placement";

/** Which directions of a table stay put for the whole movement. */
export interface StationaryDirections {
  ns: boolean;
  ew: boolean;
}

/**
 * The setup facts for a section's movement, keyed by table number, plus the
 * movement's own table count.
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

/** True when `label` is defined and identical across every round. */
function isConstant(labels: (string | undefined)[]): boolean {
  if (labels.length === 0) return false;
  const first = labels[0];
  if (first == null) return false;
  return labels.every((l) => l === first);
}

/**
 * The stationary directions of each table: a direction is stationary when its
 * pair label is the same in every round for that table.
 */
export function stationaryFromTables(
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

/**
 * The setup facts of a fixed movement laid out by table: stationary pair
 * positions and board placement (round-1 boards, physical copy, and any
 * share/relay). Gated on the movement's table count matching the section's.
 */
export function fixedMovementSetup(
  tables: MovementByTable[],
  { shareAndRelay, sectionTables }: { shareAndRelay: boolean; sectionTables: number },
): MovementResolution {
  const movementTables = tables.length;
  // Table-count gate: the movement must describe exactly this many tables, or
  // its per-table facts don't line up with the room as laid out.
  if (movementTables !== sectionTables) {
    return { stationary: new Map(), placement: new Map(), movementTables };
  }
  return {
    stationary: stationaryFromTables(tables),
    placement: withRelay(buildTablePlacement(tables), {
      shareAndRelay,
      tables: movementTables,
    }),
    movementTables,
  };
}
