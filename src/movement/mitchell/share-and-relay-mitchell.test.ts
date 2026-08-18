import { describe, expect, it } from "vitest";
import { generateShareAndRelayMitchell } from "./share-and-relay-mitchell";

describe("generateShareAndRelayMitchell", () => {
    it("generates the correct number of tables", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        expect(result.tables).toHaveLength(6);
    });

    it("generates the same number of rounds as tables", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        for (const table of result.tables) {
            expect(table.rounds).toHaveLength(6);
        }
    });

    it("keeps NS pairs stationary", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        for (const table of result.tables) {
            const nsPairs = table.rounds.map(
                (round) => round.participants.nsId,
            );

            expect(new Set(nsPairs).size).toBe(1);
            expect(nsPairs[0]).toBe(`${table.table}NS`);
        }
    });

    it("moves EW pairs one table each round", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        expect(
            table1?.rounds.map(
                (round) => round.participants.ewId,
            ),
        ).toEqual([
            "1EW",
            "6EW",
            "5EW",
            "4EW",
            "3EW",
            "2EW",
        ]);
    });

    it("has every EW pair meet every NS pair exactly once", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        for (const table of result.tables) {
            const opponents = table.rounds.map(
                (round) => round.participants.ewId,
            );

            expect(new Set(opponents).size).toBe(6);
        }
    });

    it("has the first and last tables share the same boards", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        const table6 = result.tables.find(
            (table) => table.table === 6,
        );

        expect(
            table1?.rounds.map((round) => round.boards),
        ).toEqual(
            table6?.rounds.map((round) => round.boards),
        );
    });

    it("uses the relay between the two halves of the movement", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        const table2 = result.tables.find(
            (table) => table.table === 2,
        );

        const table3 = result.tables.find(
            (table) => table.table === 3,
        );

        const table4 = result.tables.find(
            (table) => table.table === 4,
        );

        const table5 = result.tables.find(
            (table) => table.table === 5,
        );

        const table6 = result.tables.find(
            (table) => table.table === 6,
        );

        // Round 1 of a 6-table Share & Relay:
        //
        // Table 1 -> boards 1-4
        // Table 2 -> boards 5-8
        // Table 3 -> boards 9-12
        // Relay   -> boards 13-16
        // Table 4 -> boards 17-20
        // Table 5 -> boards 21-24
        // Table 6 -> boards 1-4 (shared with table 1)

        expect(table1?.rounds[0].boards).toEqual([
            1, 2, 3, 4,
        ]);

        expect(table2?.rounds[0].boards).toEqual([
            5, 6, 7, 8,
        ]);

        expect(table3?.rounds[0].boards).toEqual([
            9, 10, 11, 12,
        ]);

        expect(table4?.rounds[0].boards).toEqual([
            17, 18, 19, 20,
        ]);

        expect(table5?.rounds[0].boards).toEqual([
            21, 22, 23, 24,
        ]);

        expect(table6?.rounds[0].boards).toEqual([
            1, 2, 3, 4,
        ]);
    });

    it("advances the board sets by one set each round", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        expect(
            table1?.rounds.map((round) => round.boards),
        ).toEqual([
            [1, 2, 3, 4],
            [5, 6, 7, 8],
            [9, 10, 11, 12],
            [13, 14, 15, 16],
            [17, 18, 19, 20],
            [21, 22, 23, 24],
        ]);
    });

    it("gives every NS pair every board set exactly once", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        for (const table of result.tables) {
            const boardSets = table.rounds.map(
                (round) => round.boards.join(","),
            );

            expect(new Set(boardSets).size).toBe(6);
        }
    });

    it("does not give an NS pair the same EW opponent twice", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            shareAndRelay: true,
        });

        for (const table of result.tables) {
            const opponents = table.rounds.map(
                (round) => round.participants.ewId,
            );

            expect(new Set(opponents).size).toBe(
                opponents.length,
            );
        }
    });

    it("works with 10 tables", () => {
        const result = generateShareAndRelayMitchell({
            tables: 10,
            rounds: 10,
            boardsPerRound: 2,
            shareAndRelay: true,
        });

        expect(result.tables).toHaveLength(10);

        for (const table of result.tables) {
            expect(table.rounds).toHaveLength(10);
        }
    });

    it("shares boards between tables 1 and 10 with 10 tables", () => {
        const result = generateShareAndRelayMitchell({
            tables: 10,
            rounds: 10,
            boardsPerRound: 2,
            shareAndRelay: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        const table10 = result.tables.find(
            (table) => table.table === 10,
        );

        expect(
            table1?.rounds.map((round) => round.boards),
        ).toEqual(
            table10?.rounds.map((round) => round.boards),
        );
    });

    it("rejects an odd number of tables", () => {
        expect(() =>
            generateShareAndRelayMitchell({
                tables: 5,
                rounds: 5,
                boardsPerRound: 3,
                shareAndRelay: true,
            }),
        ).toThrow(
            "Share and Relay Mitchell requires an even number of tables",
        );
    });

    it("rejects a number of rounds different from the number of tables", () => {
        expect(() =>
            generateShareAndRelayMitchell({
                tables: 6,
                rounds: 5,
                boardsPerRound: 3,
                shareAndRelay: true,
            }),
        ).toThrow(
            "Share and Relay Mitchell requires the number of rounds to equal the number of tables",
        );
    });

    it("rejects more rounds than tables", () => {
        expect(() =>
            generateShareAndRelayMitchell({
                tables: 6,
                rounds: 7,
                boardsPerRound: 3,
                shareAndRelay: true,
            }),
        ).toThrow(
            "A Mitchell cannot have more rounds than tables",
        );
    });

    it("supports a 1-winner arrow switch", () => {
        const result = generateShareAndRelayMitchell({
            tables: 6,
            rounds: 6,
            boardsPerRound: 4,
            arrowSwitchRounds: 2,
            shareAndRelay: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        // Before the arrow switch:
        // NS 1, EW 7 (EW numbering starts at tables + 1).
        expect(table1?.rounds[0].participants).toEqual({
            nsId: "1",
            ewId: "7",
        });

        // After the arrow switch the same pair IDs
        // exchange directions.
        const lastRound =
            table1?.rounds[5].participants;

        expect(lastRound?.nsId).toBe("8");
        expect(lastRound?.ewId).toBe("1");
    });
});
