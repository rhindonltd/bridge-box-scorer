import { Tables, Table } from "@/model/movement";
import { ParticipantsByMode } from "@/model/participants";

export interface MitchellMovementSpec {
  tables: number;
  rounds: number;
  boardsPerRound: number;
  arrowSwitchRounds?: number;
  skip?: boolean;
}

export function generateMitchell(spec: MitchellMovementSpec): Tables<"PAIR"> {
  const {
    tables,
    rounds,
    boardsPerRound,
    arrowSwitchRounds = 0,
    skip = false,
  } = spec;

  if (skip && tables % 2 === 1) {
    throw new Error("Skip Mitchell cannot have an odd number of tables");
  }

  // Skip Mitchell always uses tables - 1 rounds (mathematical constraint)
  const effectiveRounds = skip ? tables - 1 : rounds;

  // When arrow switch is active, EW pair IDs use a numeric offset (N+1..2N)
  // to avoid collision with NS IDs, since pairs may swap direction.
  // When there's no arrow switch, pairs stay in their direction all game,
  // so we use direction suffixes ("NS"/"EW") instead of numeric offset.
  const ewAdd = arrowSwitchRounds > 0 ? tables : 0;

  const skipAfter = skip ? Math.floor(tables / 2) : tables;

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    result.push(
      createMitchellTable({
        tableNumber,
        tables,
        rounds: effectiveRounds,
        boardsPerRound,
        arrowSwitchRounds,
        skipAfter,
        ewAdd,
        skip,
      }),
    );
  }

  return { tables: result };
}

interface TableParams {
  tableNumber: number;
  tables: number;
  rounds: number;
  boardsPerRound: number;
  arrowSwitchRounds: number;
  skipAfter: number;
  ewAdd: number;
  skip: boolean;
}

function createMitchellTable(params: TableParams): Table<"PAIR"> {
  const {
    tableNumber,
    tables,
    rounds,
    boardsPerRound,
    arrowSwitchRounds,
    skipAfter,
    ewAdd,
    skip,
  } = params;

  // 🔑 Share & Relay detection - needed for even tables without skip
  const relayNeeded = tables % 2 === 0 && !skip;

  // 🔑 This creates SHARE for relay variant
  const firstSet =
    relayNeeded && tableNumber > tables / 2 ? tableNumber + 1 : tableNumber;

  const arrowSwitchFrom = rounds - arrowSwitchRounds + 1;

  const roundsList: {
    round: number;
    boards: number[];
    participants: ParticipantsByMode["PAIR"];
  }[] = [];

  for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
    // 🔁 Skip logic for EW movement
    const distanceMoved = computeEwDistance(roundNumber, skipAfter, tables);

    // 🔁 EW movement
    const movingPair = wrapValue(tableNumber - distanceMoved, tables) + ewAdd;

    // 🔁 Board assignment
    const boardDist = computeBoardDistance(
      roundNumber,
      skip,
      skipAfter,
      tables,
    );
    const boardSet = wrapValue(firstSet + boardDist, tables);

    const boards = boardsForSet(boardSet, boardsPerRound);

    // 🔀 Pair ID generation
    let nsId: string;
    let ewId: string;

    if (arrowSwitchRounds === 0) {
      // No arrow switch — pairs stay in their direction all game
      nsId = `${tableNumber}NS`;
      ewId = `${movingPair}EW`;
    } else {
      // Arrow switch — pairs may swap direction, use numeric IDs
      if (roundNumber < arrowSwitchFrom) {
        nsId = `${tableNumber}`;
        ewId = `${movingPair}`;
      } else {
        nsId = `${movingPair}`;
        ewId = `${tableNumber}`;
      }
    }

    roundsList.push({
      round: roundNumber,
      boards,
      participants: { nsId, ewId },
    });
  }

  return {
    table: tableNumber,
    rounds: roundsList,
  };
}

/**
 * Compute EW distance moved from starting position for a given round.
 * For standard Mitchell: distance increases by 1 each round (0, 1, 2, ..., N-1).
 * For skip Mitchell: at the midpoint, EW skips one extra table.
 * The formula produces N distinct values mod N for a complete movement.
 */
export function computeEwDistance(
  roundNumber: number,
  skipAfter: number,
  tables: number,
): number {
  if (roundNumber <= skipAfter) {
    // First half (or all rounds for non-skip): standard progression
    return roundNumber - 1;
  } else if (roundNumber < tables) {
    // After skip but before last round: add 1 extra for the skip
    return roundNumber;
  } else {
    // Last round of a skip Mitchell: fill the gap left by the skip
    return skipAfter;
  }
}

/**
 * Compute board distance for a given round.
 * For all Mitchell variants: boards advance by 1 each round (standard progression).
 *
 * For skip Mitchell, board uniqueness for both NS and EW pairs is achieved by
 * limiting the number of rounds to tables - 1 (standard skip Mitchell practice).
 * It is mathematically impossible to achieve both NS and EW board uniqueness
 * with N rounds and N board sets for even N, so skip Mitchell movements
 * must be curtailed by one round.
 */
function computeBoardDistance(
  roundNumber: number,
  _skip: boolean,
  _skipAfter: number,
  _tables: number,
): number {
  // All variants use standard board progression: advance 1 per round
  return roundNumber - 1;
}

function wrapValue(v: number, modulus: number): number {
  if (v > 0) {
    return ((v - 1) % modulus) + 1;
  } else {
    return modulus - (-v % modulus);
  }
}

function boardsForSet(set: number, perRound: number): number[] {
  const start = (set - 1) * perRound + 1;
  return Array.from({ length: perRound }, (_, i) => start + i);
}
