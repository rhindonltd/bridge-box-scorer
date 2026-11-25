import {
  MovementFileEntry,
  parseHeader,
  parseInts,
  chunk,
  buildTables,
  buildMovementBase,
  boardSetToBoardList,
} from "@/modules/movement-catalog/shared";
import { splitLinesOfFile } from "./movement-file";
import { PairParticipants, Table } from "@/model/movement";

// ---- Parser ----

const parsePairsRounds =
  (boardsPerRound: number) =>
  (
    line: string,
  ): {
    round: number;
    boards: number[];
    participants: PairParticipants;
  }[] =>
    chunk(parseInts(line), 3).map(([ns, ew, boardSet], index) => ({
      round: index + 1,
      boards: boardSetToBoardList(boardSet, boardsPerRound),
      participants: {
        nsId: `${ns}`,
        ewId: `${ew}`,
      },
    }));

// ---- Generator ----

export const generatePairsMovements = (): MovementFileEntry[] =>
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
