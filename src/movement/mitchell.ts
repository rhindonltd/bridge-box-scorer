import { Round, Tables, Table } from "@/model/movement";
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

  // ewAdd ensures NS and EW pairs don't overlap (needed for arrow switch)
  const ewAdd = arrowSwitchRounds > 0 ? tables : 0;

  const skipAfter = skip ? Math.floor(tables / 2) : tables;

  const result: Table<"PAIR">[] = [];

  for (let tableNumber = 1; tableNumber <= tables; tableNumber++) {
    result.push(
      createMitchellTable({
        tableNumber,
        tables,
        rounds,
        boardsPerRound,
        arrowSwitchRounds,
        skipAfter,
        ewAdd,
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
  } = params;

  // 🔑 Share & Relay detection
  const relayNeeded = tables % 2 === 0 && skipAfter >= rounds;

  // 🔑 This creates SHARE
  const firstSet =
    relayNeeded && tableNumber > tables / 2 ? tableNumber + 1 : tableNumber;

  const arrowSwitchFrom = rounds - arrowSwitchRounds + 1;

  const roundsList: {
    round: number;
    boards: number[];
    participants: ParticipantsByMode["PAIR"];
  }[] = [];

  for (let roundNumber = 1; roundNumber <= rounds; roundNumber++) {
    // 🔁 Skip logic
    const distanceMoved =
      roundNumber > skipAfter ? roundNumber : roundNumber - 1;

    // 🔁 EW movement
    const movingPair = wrapValue(tableNumber - distanceMoved, tables) + ewAdd;

    // 🔁 Board assignment (THIS creates relay)
    const boardSet = wrapValue(firstSet + (roundNumber - 1), tables);

    const boards = boardsForSet(boardSet, boardsPerRound);

    // 🔀 Arrow switch handling
    let nsId: string;
    let ewId: string;

    if (roundNumber < arrowSwitchFrom) {
      nsId = `${tableNumber}`;
      ewId = `${movingPair}`;
    } else {
      nsId = `${movingPair}`;
      ewId = `${tableNumber}`;
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
