import type { Tables } from "@/model/movement";

/**
 * Raw movement table data as returned from the API.
 * Works for PAIRS (ns/ew) movements.
 */
export type MovementByTable = {
  tableNumber: number;
  rounds: {
    roundNumber: number;
    ns?: string;
    ew?: string;
    boardStart: number;
    boardEnd: number;
    /**
     * Physical duplicate copy of the board set played this round (Web Mitchell
     * only). Undefined for single-copy movements (the vast majority) and for
     * seeded specs, which have no copy concept.
     */
    boardCopy?: string;
    played?: number;
    total?: number;
    hasPreviousGap?: boolean;
  }[];
};

export type MovementByRound = {
  roundNumber: number;
  tables: {
    tableNumber: number;
    ns?: string;
    ew?: string;
    boardStart: number;
    boardEnd: number;
    /**
     * Physical duplicate copy of the board set played this round (Web Mitchell
     * only). Undefined for single-copy movements and seeded specs.
     */
    boardCopy?: string;
    played?: number;
    total?: number;
    hasPreviousGap?: boolean;
  }[];
};

/**
 * Map a generated pair movement (`Tables<"PAIR">`) to the `MovementByTable`
 * display shape, carrying each round's `boardCopy` through. Board numbers come
 * straight from the generator's explicit `boards` list, so this works for every
 * Mitchell-family movement including Web (which is the only family that sets a
 * meaningful `boardCopy`).
 */
export function generatedToMovementByTable(
  generated: Tables<"PAIR">,
): MovementByTable[] {
  return generated.tables.map((t) => ({
    tableNumber: t.table,
    rounds: t.rounds.map((r) => ({
      roundNumber: r.round,
      ns: r.participants.nsId,
      ew: r.participants.ewId,
      boardStart: r.boards[0],
      boardEnd: r.boards[r.boards.length - 1],
      boardCopy: r.boardCopy,
    })),
  }));
}

export function buildRounds(tables: MovementByTable[]): MovementByRound[] {
  if (tables.length === 0) return [];

  const roundCount = tables[0].rounds.length;
  const rounds: MovementByRound[] = [];

  for (let r = 0; r < roundCount; r++) {
    rounds.push({
      roundNumber: r + 1,
      tables: tables.map((t) => ({
        tableNumber: t.tableNumber,
        ...t.rounds[r],
      })),
    });
  }

  return rounds;
}
