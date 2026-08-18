import { MitchellMovementSpec } from "./mitchell-utils";

type MitchellMovementOption = {
  name: string;
  spec: MitchellMovementSpec;
};

export function findBestBoardsPerPlayer(
  tables: number,
  targetBoards = 20,
  minBoardsPerRound = 2,
  maxBoardsPerRound = 12,
): number {
  const maxTargetBoards = targetBoards + 10;

  // Maximise rounds.
  for (let rounds = tables; rounds >= 2; rounds--) {
    for (
      let boardsPerRound = minBoardsPerRound;
      boardsPerRound <= maxBoardsPerRound;
      boardsPerRound++
    ) {
      const boardsPerPlayer = rounds * boardsPerRound;

      // Must be within the desired board-count range.
      if (boardsPerPlayer < targetBoards || boardsPerPlayer > maxTargetBoards) {
        continue;
      }

      // The movement must actually have this number of rounds.
      // Since we constructed boardsPerPlayer as
      // rounds * boardsPerRound, this is guaranteed.
      //
      // We also know:
      //   rounds >= 2
      //   rounds <= tables
      //   minBoardsPerRound <= boardsPerRound <= maxBoardsPerRound
      //
      // Therefore this is a valid movement candidate.
      return boardsPerPlayer;
    }
  }

  return targetBoards;
}

export function generateMitchellOptions(
  tables: number,
  boardsPerPlayer: number,
  minBoardsPerRound = 2,
  maxBoardsPerRound = 12,
): MitchellMovementOption[] {
  if (!Number.isInteger(tables) || tables < 1) {
    throw new Error("tables must be a positive integer");
  }

  if (!Number.isInteger(boardsPerPlayer) || boardsPerPlayer < 1) {
    throw new Error("boardsPerPlayer must be a positive integer");
  }

  if (
    !Number.isInteger(minBoardsPerRound) ||
    !Number.isInteger(maxBoardsPerRound) ||
    minBoardsPerRound < 1 ||
    maxBoardsPerRound < minBoardsPerRound
  ) {
    throw new Error("Invalid boards-per-round limits");
  }

  const isOddNumberOfTables = tables % 2 !== 0;

  // Try the smallest number of boards per round first.
  // This maximises the number of rounds.
  for (
    let boardsPerRound = minBoardsPerRound;
    boardsPerRound <= maxBoardsPerRound;
    boardsPerRound++
  ) {
    // The boards must divide exactly into the rounds.
    if (boardsPerPlayer % boardsPerRound !== 0) {
      continue;
    }

    const rounds = boardsPerPlayer / boardsPerRound;

    // A Mitchell must have more than one round.
    if (rounds <= 1) {
      continue;
    }

    // A Mitchell can never have more rounds than tables.
    if (rounds > tables) {
      continue;
    }

    console.log({
      tables,
      boardsPerPlayer,
      boardsPerRound,
      rounds,
      calculatedBoards: rounds * boardsPerRound,
    });

    if (isOddNumberOfTables) {
      return [
        {
          name: "Mitchell",
          spec: {
            tables,
            rounds,
            boardsPerRound,
          },
        },
      ];
    } else if (rounds === tables) {
      return [
        {
          name: "Mitchell - Share and Relay",
          spec: {
            tables,
            rounds,
            boardsPerRound,
            shareAndRelay: true,
          },
        },
      ];
    } else {
      return [
        {
          name: "Mitchell - Skip",
          spec: {
            tables,
            rounds,
            boardsPerRound,
            skip: true,
          },
        },
      ];
    }
  }

  // No valid movement exists within the constraints.
  return [];
}
