import { Table, Tables } from "@/model/movement";
import { MitchellMovementSpec } from "@/movement/mitchell";

// -----------------------------
// Top-level validation entry
// -----------------------------
export function validateMitchell(
  movement: Tables,
  options: MitchellMovementSpec,
) {
  const {
    tables,
    rounds,
    boardsPerRound,
    arrowSwitchRounds = 0,
    skip = false,
  } = options;

  const twoWinner = arrowSwitchRounds === 0;
  const skipAfter = skip ? Math.floor(tables / 2) : tables;

  if (movement.tables.length !== tables) {
    throw new Error(`Expected ${tables} tables, got ${movement.tables.length}`);
  }

  const trackers = initializeTrackers();

  validateRounds(movement.tables, rounds, boardsPerRound, twoWinner, trackers);

  validateOpponents(trackers.opponents, rounds);

  validateNSTables(trackers.nsTables, arrowSwitchRounds);

  validateRoleBalance(trackers.roles, arrowSwitchRounds);

  return { valid: true };
}

// -----------------------------
// Initialize all trackers
// -----------------------------
function initializeTrackers() {
  return {
    opponents: new Map<number, Set<number>>(),
    boardsPlayed: new Map<number, Map<number, number>>(),
    roles: new Map<number, string[]>(),
    nsTables: new Map<number, Set<number>>(),
  };
}

// -----------------------------
// Add board and opponent helpers
// -----------------------------
function addOpponent(
  opponents: Map<number, Set<number>>,
  a: number,
  b: number,
) {
  if (!opponents.has(a)) opponents.set(a, new Set());
  opponents.get(a)!.add(b);
}

function addBoards(
  boardsPlayed: Map<number, Map<number, number>>,
  pair: number,
  boards: number[],
  twoWinner: boolean,
) {
  if (!boardsPlayed.has(pair)) boardsPlayed.set(pair, new Map());
  const set = boardsPlayed.get(pair)!;

  for (const b of boards) {
    const count = set.get(b) ?? 0;
    const maxCount = twoWinner ? 2 : 1;
    if (count >= maxCount) {
      throw new Error(
        `Pair ${pair} plays board ${b} too many times (max ${maxCount})`,
      );
    }
    set.set(b, count + 1);
  }
}

function validateRounds(
  tableList: Table[],
  rounds: number,
  boardsPerRound: number,
  twoWinner: boolean,
  trackers: ReturnType<typeof initializeTrackers>,
) {
  const totalPairs = tableList.length * 2;

  for (let r = 0; r < rounds; r++) {
    const seenNS = new Set<number>();
    const seenEW = new Set<number>();
    const boardCounts = new Map<number, number>();

    for (const table of tableList) {
      validateTableRound(
        table,
        r,
        boardsPerRound,
        twoWinner,
        trackers,
        seenNS,
        seenEW,
        boardCounts,
      );
    }

    validateRoundPairs(seenNS, seenEW, totalPairs, r);
    validateRoundBoards(boardCounts, r);
  }
}

// -----------------------------
// Validate a single table in a round
// -----------------------------
function validateTableRound(
  table: Table,
  roundIndex: number,
  boardsPerRound: number,
  twoWinner: boolean,
  trackers: ReturnType<typeof initializeTrackers>,
  seenNS: Set<number>,
  seenEW: Set<number>,
  boardCounts: Map<number, number>,
) {
  const pr = table.rounds[roundIndex];
  if (!pr)
    throw new Error(`Missing round ${roundIndex + 1} for table ${table.table}`);

  const { ns, ew, boards } = pr;

  // NS ≠ EW check
  if (ns === ew && !(twoWinner && roundIndex === 0)) {
    throw new Error(
      `Table ${table.table}, round ${roundIndex + 1}: Pair plays itself`,
    );
  }

  // Track seen pairs
  seenNS.add(ns);
  seenEW.add(ew);

  // Opponents
  addOpponent(trackers.opponents, ns, ew);
  addOpponent(trackers.opponents, ew, ns);

  // Board checks
  if (boards.length !== boardsPerRound) {
    throw new Error(
      `Incorrect board count at table ${table.table}, round ${roundIndex + 1}`,
    );
  }
  addBoards(trackers.boardsPlayed, ns, boards, twoWinner);

  for (const b of boards) {
    boardCounts.set(b, (boardCounts.get(b) || 0) + 1);
  }

  // Roles
  if (!trackers.roles.has(ns)) trackers.roles.set(ns, []);
  if (!trackers.roles.has(ew)) trackers.roles.set(ew, []);
  trackers.roles.get(ns)!.push("NS");
  trackers.roles.get(ew)!.push("EW");

  // NS table tracking
  if (!trackers.nsTables.has(ns)) trackers.nsTables.set(ns, new Set());
  trackers.nsTables.get(ns)!.add(table.table);
}

// -----------------------------
// Validate no duplicate pairs in a round
// -----------------------------
function validateRoundPairs(
  seenNS: Set<number>,
  seenEW: Set<number>,
  totalPairs: number,
  roundIndex: number,
) {
  if (seenNS.size + seenEW.size !== totalPairs) {
    throw new Error(`Incorrect number of pairs in round ${roundIndex + 1}`);
  }
}

// -----------------------------
// Validate board counts in a round
// -----------------------------
function validateRoundBoards(
  boardCounts: Map<number, number>,
  roundIndex: number,
) {
  for (const [board, count] of boardCounts) {
    if (count !== 1) {
      throw new Error(
        `Board ${board} played ${count} times in round ${roundIndex + 1}`,
      );
    }
  }
}

// -----------------------------
// Validate opponents
// -----------------------------
function validateOpponents(
  opponents: Map<number, Set<number>>,
  rounds: number,
) {
  for (const [pair, opps] of opponents) {
    if (opps.size !== rounds) {
      throw new Error(`Pair ${pair} has repeated opponents`);
    }
  }
}

// -----------------------------
// NS tables validation (stationary in non-arrow)
// -----------------------------
function validateNSTables(
  nsTables: Map<number, Set<number>>,
  arrowSwitchRounds: number,
) {
  if (arrowSwitchRounds === 0) {
    for (const tablesSet of nsTables.values()) {
      if (tablesSet.size !== 1) {
        throw new Error("NS pair moved in non-arrow Mitchell");
      }
    }
  }
}

// -----------------------------
// NS/EW balance validation
// -----------------------------
function validateRoleBalance(
  roles: Map<number, string[]>,
  arrowSwitchRounds: number,
) {
  if (arrowSwitchRounds > 0) {
    for (const [pair, r] of roles) {
      const nsCount = r.filter((x) => x === "NS").length;
      const ewCount = r.length - nsCount;
      if (Math.abs(nsCount - ewCount) > 1) {
        throw new Error(`Unbalanced NS/EW for pair ${pair}`);
      }
    }
  }
}
