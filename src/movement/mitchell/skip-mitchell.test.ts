import { describe, expect, it } from "vitest";
import { generateSkipMitchell } from "./skip-mitchell";

describe("generateSkipMitchell", () => {
    it("generates the correct number of tables", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
        });

        expect(result.tables).toHaveLength(18);
    });

    it("generates the requested number of rounds", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
        });

        for (const table of result.tables) {
            expect(table.rounds).toHaveLength(15);
        }
    });

    it("keeps NS pairs stationary", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
        });

        for (const table of result.tables) {
            const nsPairs = table.rounds.map(
                (round) => round.participants.nsId,
            );

            expect(new Set(nsPairs).size).toBe(1);
            expect(nsPairs[0]).toBe(`${table.table}NS`);
        }
    });

    it("makes the skip after half the number of tables", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
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
            "18EW",
            "17EW",
            "16EW",
            "15EW",
            "14EW",
            "13EW",
            "12EW",
            "11EW",
            "9EW",
            "8EW",
            "7EW",
            "6EW",
            "5EW",
            "4EW",
        ]);
    });

    it("bases the skip on the number of tables, not the number of rounds", () => {
        // 18 tables means the skip happens after round 9,
        // even though this movement only has 12 rounds.
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 12,
            boardsPerRound: 2,
            skip: true,
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
            "18EW",
            "17EW",
            "16EW",
            "15EW",
            "14EW",
            "13EW",
            "12EW",
            "11EW",
            "9EW",
            "8EW",
            "7EW",
        ]);
    });

    it("does not visit the skipped table position", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
        });

        const table1 = result.tables.find(
            (table) => table.table === 1,
        );

        const opponents = table1?.rounds.map(
            (round) => round.participants.ewId,
        );

        expect(opponents).not.toContain("10EW");
    });

    it("does not give an NS pair the same EW opponent twice", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
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

    it("does not give an EW pair the same NS opponent twice", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 15,
            boardsPerRound: 2,
            skip: true,
        });

        const meetings = new Set<string>();

        for (const table of result.tables) {
            for (const round of table.rounds) {
                const { nsId, ewId } = round.participants;

                const meeting = `${nsId}-${ewId}`;

                expect(meetings.has(meeting)).toBe(false);

                meetings.add(meeting);
            }
        }
    });

    it("works with a movement where the skip occurs after the movement ends", () => {
        // 18 tables => skip after round 9.
        // With only 8 rounds, the skip is never reached.
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 8,
            boardsPerRound: 2,
            skip: true,
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
            "18EW",
            "17EW",
            "16EW",
            "15EW",
            "14EW",
            "13EW",
            "12EW",
        ]);
    });

    it("supports a 6-table skip Mitchell", () => {
        const result = generateSkipMitchell({
            tables: 6,
            rounds: 5,
            boardsPerRound: 3,
            skip: true,
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
            "3EW",
            "2EW",
        ]);
    });

    it("rejects an odd number of tables", () => {
        expect(() =>
            generateSkipMitchell({
                tables: 5,
                rounds: 4,
                boardsPerRound: 2,
                skip: true,
            }),
        ).toThrow(
            "Skip Mitchell requires an even number of tables",
        );
    });

    it("rejects a number of rounds equal to the number of tables", () => {
        expect(() =>
            generateSkipMitchell({
                tables: 6,
                rounds: 6,
                boardsPerRound: 2,
                skip: true,
            }),
        ).toThrow(
            "Skip Mitchell must have fewer rounds than tables",
        );
    });

    it("rejects a number of rounds greater than the number of tables", () => {
        expect(() =>
            generateSkipMitchell({
                tables: 6,
                rounds: 7,
                boardsPerRound: 2,
                skip: true,
            }),
        ).toThrow(
            "A Mitchell cannot have more rounds than tables",
        );
    });

    it("bases the skip on the number of tables, not the number of rounds", () => {
        const result = generateSkipMitchell({
            tables: 18,
            rounds: 12,
            boardsPerRound: 2,
            skip: true,
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
            "18EW",
            "17EW",
            "16EW",
            "15EW",
            "14EW",
            "13EW",
            "12EW",
            "11EW",
            "9EW",
            "8EW",
            "7EW",
        ]);
    });
});
