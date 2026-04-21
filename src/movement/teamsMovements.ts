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
import { Table } from "@/model/movement";
import { ParticipantsByMode } from "@/model/participants";

// ---- Parser ----

const parsePairsRounds =
  (boardsPerRound: number) =>
  (
    line: string,
  ): {
    round: number;
    boards: number[];
    participants: ParticipantsByMode["PAIR"];
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

export const generateTeamsMovements = (): Movement<"PAIR">[] =>
  splitLinesOfFile("TSMovements.txt")
    .filter((lines) => lines.length >= 2)
    .map((lines) => {
      const header = parseHeader(lines);

      const tables: Table<"PAIR">[] = buildTables(
        lines,
        parsePairsRounds(header.defaultBoardsPerSet),
      );

      return buildMovementBase(header, tables);
    });
