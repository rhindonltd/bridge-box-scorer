import * as fs from "fs";
import * as path from "path";
import { PairRound, Round, Rounds, Table, Tables } from "@/model/movement";

// ---- Types ----

export enum MovementType {
  MITCHELL,
  SWITCHED_MITCHELL,
  HOWELL,
  AMERICAN_WHIST,
  SCORE_BREAK,
}

export const parseMovementType = (value: number): MovementType => value;

export type MovementHeader = {
  name: string;
  movementType: MovementType;
  numberOfTables: number;
  numberOfBoardSets: number;
  numberOfRounds: number;
  defaultBoardsPerSet: number;
  missingPair: number;
};

export type Movement = {
  name: string;
  description: string;
  tables: number;
  boards: number;
  boardsPerRound: number;
  rounds: number;
  tableData: Table[];
  missingPair?: number;
  type: MovementType;
};

// ---- Helpers ----

export const parseInts = (line: string): number[] =>
  line.split(",").map((x) => parseInt(x.trim(), 10));

export const splitLinesOfFile = (fileName: string): string[][] => {
  const content = fs.readFileSync(path.join(__dirname, fileName), "utf-8");

  return content
    .split(/\r?\n/)
    .reduce<string[][]>(
      (groups, line) => {
        if (line.trim() === "") return [...groups, []];

        const last = groups[groups.length - 1];
        if (!last) return [[line]];

        return [...groups.slice(0, -1), [...last, line]];
      },
      [[]],
    )
    .filter((group) => group.length > 0);
};

export const parseHeader = ([
  firstLine,
  secondLine,
]: string[]): MovementHeader => {
  const ints = parseInts(secondLine);

  return {
    name: firstLine,
    movementType: parseMovementType(ints[0]),
    numberOfTables: ints[1],
    numberOfBoardSets: ints[2] / ints[3],
    defaultBoardsPerSet: ints[3],
    numberOfRounds: ints[4],
    missingPair: ints.length >= 6 ? ints[5] : 0,
  };
};

export const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

export const buildMovementBase = <T>(
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
  missingPair: header.missingPair,
  type: header.movementType,
});

export const buildTables = (
  lines: string[],
  roundParser: (line: string) => PairRound[],
): Table[] =>
  lines.slice(2).map((line, idx) => ({
    table: idx + 1,
    rounds: roundParser(line),
  }));

export const boardSetToBoardList = (
  boardSet: number,
  boardsPerRound: number,
): number[] => {
  const start = (boardSet - 1) * boardsPerRound + 1;

  return Array.from({ length: boardsPerRound }, (_, i) => start + i);
};

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
      pair: table.rounds[roundIdx],
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
