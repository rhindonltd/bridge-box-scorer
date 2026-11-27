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
import { normaliseTeamsTables } from "@/modules/movement-catalog/teams/teams-library";
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

export const generateTeamsMovements = (): MovementFileEntry[] =>
  splitLinesOfFile("TSMovements.txt")
    .filter((lines) => lines.length >= 2)
    .map((lines) => {
      const header = parseHeader(lines);

      // Rows are tables; put them in team order so table T is team T's home.
      const tables: Table[] = normaliseTeamsTables(
        buildTables(lines, parsePairsRounds(header.defaultBoardsPerSet)),
      );

      return buildMovementBase(header, tables);
    });
