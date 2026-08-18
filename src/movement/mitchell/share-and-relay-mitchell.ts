import {
    boardsForSet,
    getPairIds,
    MitchellMovementSpec,
    validateMitchellSpec,
    wrapValue,
} from "./mitchell-utils";

import { Table, Tables } from "../../model/movement";

export interface ShareAndRelayMovementSpec
    extends MitchellMovementSpec {
    shareAndRelay: true;
}

export function generateShareAndRelayMitchell(
    spec: ShareAndRelayMovementSpec,
): Tables<"PAIR"> {
    const {
        tables,
        rounds,
        boardsPerRound,
        arrowSwitchRounds = 0,
    } = spec;

    validateMitchellSpec(spec);

    if (tables % 2 !== 0) {
        throw new Error(
            "Share and Relay Mitchell requires an even number of tables",
        );
    }

    if (rounds !== tables) {
        throw new Error(
            "Share and Relay Mitchell requires the number of rounds to equal the number of tables",
        );
    }

    const result: Table<"PAIR">[] = [];

    for (
        let tableNumber = 1;
        tableNumber <= tables;
        tableNumber++
    ) {
        const roundsList = [];

        for (
            let roundNumber = 1;
            roundNumber <= rounds;
            roundNumber++
        ) {
            /*
             * EW movement is the same as a normal Mitchell:
             * EW moves down one table each round.
             */
            const ewTable = wrapValue(
                tableNumber - (roundNumber - 1),
                tables,
            );

            /*
             * Board movement:
             *
             * The first table and last table share boards.
             *
             * There is a relay halfway through the movement,
             * so one board set is absent from the playing tables.
             *
             * For round 1:
             *
             *   Table 1       -> set 1
             *   Table 2       -> set 2
             *   ...
             *   Table N/2     -> set N/2
             *   Relay         -> set N/2 + 1
             *   Table N/2+1   -> set N/2 + 2
             *   ...
             *   Table N-1     -> set N
             *   Table N       -> set 1
             *
             * Each subsequent round advances the board sets by one.
             */

            let boardSet: number;

            if (tableNumber <= tables / 2) {
                // First half of the room.
                boardSet = wrapValue(
                    tableNumber + roundNumber - 1,
                    tables,
                );
            } else {
                // Second half of the room.
                //
                // The last table shares the first table's boards.
                // The remaining tables are shifted by one to leave
                // the relay board set between the two halves.
                boardSet = wrapValue(
                    tableNumber + roundNumber,
                    tables,
                );
            }

            const boards = boardsForSet(
                boardSet,
                boardsPerRound,
            );

            /*
             * Pair numbering and arrow switching are shared
             * by all Mitchell movements.
             */
            const { nsId, ewId } = getPairIds(
                tableNumber,
                ewTable,
                tables,
                arrowSwitchRounds,
                roundNumber,
                rounds,
            );

            roundsList.push({
                round: roundNumber,
                boards,
                participants: {
                    nsId,
                    ewId,
                },
            });
        }

        result.push({
            table: tableNumber,
            rounds: roundsList,
        });
    }

    return { tables: result };
}
