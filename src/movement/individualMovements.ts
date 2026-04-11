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

const parseIndividualRounds =
    (boardsPerRound: number) =>
        (
            line: string,
        ): {
            round: number;
            boards: number[];
            participants: ParticipantsByMode["INDIVIDUAL"];
        }[] =>
            chunk(parseInts(line), 5).map(([n, s, e, w, boardSet], index) => ({
                round: index + 1,
                boards: boardSetToBoardList(boardSet, boardsPerRound),
                participants: {
                    nId: `${n}`,
                    sId: `${s}`,
                    eId: `${e}`,
                    wId: `${w}`,
                },
            }));

// ---- Generator ----

export const generateIndividualMovements = (): Movement<'INDIVIDUAL'>[] =>
    splitLinesOfFile("ISMovements.txt")
        .filter((lines) => lines.length >= 2)
        .map((lines) => {
            const header = parseHeader(lines);

            const tables: Table<"INDIVIDUAL">[] = buildTables(
                lines,
                parseIndividualRounds(header.defaultBoardsPerSet),
            );

            return buildMovementBase(header, tables);
        });
