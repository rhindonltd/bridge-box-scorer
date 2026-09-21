import * as fs from "fs";
import * as path from "path";
import {
  PairParticipants,
  Round,
  Rounds,
  Table,
  Tables,
} from "@/model/movement";
import { boardsForSet } from "./mitchell/mitchell-utils";

// ---- Types ----

export enum MovementType {
  MITCHELL,
  SWITCHED_MITCHELL,
  HOWELL,
  AMERICAN_WHIST,
  SCORE_BREAK,
}

/**
 * Cast a movement-file's numeric type code to {@link MovementType}. The enum is
 * numeric and aligned to the file's codes (0 = Mitchell, …), so this is a cast,
 * not a validating parse — an out-of-range code would pass through unchanged.
 */
export const toMovementType = (value: number): MovementType => value;

export type MovementHeader = {
  name: string;
  movementType: MovementType;
  numberOfTables: number;
  numberOfBoardSets: number;
  numberOfRounds: number;
  defaultBoardsPerSet: number;
  missingParticipant: number;
};

export type Movement = {
  name: string;
  description: string;
  tables: number;
  boards: number;
  boardsPerRound: number;
  rounds: number;
  tableData: Table[];
  missingParticipant?: number;
  type: MovementType;
};

// ---- Helpers ----

export const parseInts = (line: string): number[] =>
  line.split(",").map((x) => parseInt(x.trim(), 10));

export const groupLinesReducer = (
  groups: string[][],
  line: string,
): string[][] => {
  if (line.trim() === "") return [...groups, []];

  const last = groups[groups.length - 1];
  if (!last) return [[line]];

  return [...groups.slice(0, -1), [...last, line]];
};

export const splitLinesOfFile = (fileName: string): string[][] => {
  const content = fs.readFileSync(path.join(__dirname, fileName), "utf-8");

  return content
    .split(/\r?\n/)
    .reduce<string[][]>(groupLinesReducer, [[]])
    .filter((group) => group.length > 0);
};

export const parseHeader = ([
  firstLine,
  secondLine,
]: string[]): MovementHeader => {
  const ints = parseInts(secondLine);

  return {
    name: firstLine,
    movementType: toMovementType(ints[0]),
    numberOfTables: ints[1],
    numberOfBoardSets: ints[2] / ints[3],
    defaultBoardsPerSet: ints[3],
    numberOfRounds: ints[4],
    missingParticipant: ints.length >= 6 ? ints[5] : 0,
  };
};

export const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

export const buildMovementBase = (
  header: MovementHeader,
  tables: Table[],
): Movement => ({
  name: header.name,
  description: header.name,
  tables: header.numberOfTables,
  boards: header.numberOfBoardSets * header.defaultBoardsPerSet,
  boardsPerRound: header.defaultBoardsPerSet,
  rounds: header.numberOfRounds,
  tableData: tables,
  missingParticipant: header.missingParticipant,
  type: header.movementType,
});

export function buildTables(
  lines: string[],
  roundParser: (line: string) => {
    round: number;
    boards: number[];
    participants: PairParticipants;
  }[],
): Table[] {
  return lines.slice(2).map((line, idx) => ({
    table: idx + 1,
    rounds: roundParser(line),
  }));
}

/**
 * Expand a 1-based board-set index into its board numbers. This is the
 * movement-facing name for {@link boardsForSet} (the Mitchell family's internal
 * name for the same operation); it re-exports the one implementation so pairs
 * and teams movements read in movement terms without a second copy to drift.
 */
export const boardSetToBoardList = boardsForSet;

/**
 * Inverse of {@link boardSetToBoardList}: recover the 1-based board-set index
 * from the first board number of a round and the boards-per-round it was laid
 * out with. Board sets are always aligned to boards-per-round boundaries, so
 * this is exact.
 */
export const boardSetFor = (
  firstBoard: number,
  boardsPerRound: number,
): number => Math.floor((firstBoard - 1) / boardsPerRound) + 1;

/**
 * Compute the inclusive board range a round plays, given its board-set index
 * and the chosen boards-per-round.
 */
export const boardRangeForSet = (
  boardSet: number,
  boardsPerRound: number,
): { boardStart: number; boardEnd: number } => {
  const boardStart = (boardSet - 1) * boardsPerRound + 1;

  return { boardStart, boardEnd: boardStart + boardsPerRound - 1 };
};

/**
 * Collapse a list of board numbers into a compact range string, e.g.
 * `[1,2,3,5]` → `"1-3,5"`. Consecutive runs become `start-end`; singletons stay
 * bare. The loop runs one past the end on purpose: at `i === boards.length`,
 * `boards[i]` is `undefined`, which never equals `end + 1`, so the final run is
 * flushed by the same `else` branch that flushes every other run.
 */
export const formatBoards = (boards: number[]): string => {
  if (boards.length === 0) return "";
  const ranges: string[] = [];
  let start = boards[0];
  let end = boards[0];

  for (let i = 1; i <= boards.length; i++) {
    if (boards[i] === end + 1) {
      end = boards[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = boards[i];
      end = boards[i];
    }
  }

  return ranges.join(",");
};

export function groupByRound(movement: Tables): Rounds {
  if (movement.tables.length === 0)
    return {
      rounds: [],
    };

  const roundsCount = movement.tables[0].rounds.length;

  const rounds: Round[] = [];

  for (let roundIdx = 0; roundIdx < roundsCount; roundIdx++) {
    const roundTables = movement.tables.map((table) => ({
      table: table.table,
      boards: table.rounds[roundIdx].boards,
      boardCopy: table.rounds[roundIdx].boardCopy,
      participants: table.rounds[roundIdx].participants,
    }));

    rounds.push({
      round: roundIdx + 1, // 1-indexed
      tables: roundTables,
    });
  }

  return {
    rounds,
  };
}
