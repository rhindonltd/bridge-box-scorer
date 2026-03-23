import {
  Movement,
  splitLinesOfFile,
  parseHeader,
  parseInts,
  chunk,
  buildTables,
  buildMovementBase,
  boardSetToBoardList,
} from "./shared";
import { PairRound, Table } from "@/model/movement";

// ---- Parser ----

const parsePairsRounds =
  (boardsPerRound: number) =>
  (line: string): PairRound[] =>
    chunk(parseInts(line), 3).map(([ns, ew, boardSet]) => ({
      boards: boardSetToBoardList(boardSet, boardsPerRound),
      ns,
      ew,
    }));

// ---- Generator ----

export const generatePairsMovements = (): Movement[] =>
  splitLinesOfFile("PSMovements.txt")
    .filter((lines) => lines.length >= 2)
    .map((lines) => {
      const header = parseHeader(lines);

      const tables: Table[] = buildTables(
        lines,
        parsePairsRounds(header.defaultBoardsPerSet),
      );

      return buildMovementBase(header, tables);
    });
