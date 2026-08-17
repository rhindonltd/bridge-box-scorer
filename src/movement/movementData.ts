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
    played?: number;
    total?: number;
    hasPreviousGap?: boolean;
  }[];
};

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
