import { describe, expect, it } from "vitest";
import { generateWebMitchell } from "./web-mitchell";
import { Tables } from "../../model/movement";

/**
 * Targets taken from the same set the original gen-web-mitchell script
 * validated: even-table Webs (14/16/18/20 at 8 rounds, 18 at 9 rounds) plus
 * the odd-table gaps (13/15/17/19 at 8 rounds, 19 at 9 rounds).
 */
const TARGETS: { tables: number; rounds: number }[] = [
  { tables: 14, rounds: 8 },
  { tables: 16, rounds: 8 },
  { tables: 18, rounds: 8 },
  { tables: 20, rounds: 8 },
  { tables: 18, rounds: 9 },
  { tables: 13, rounds: 8 },
  { tables: 15, rounds: 8 },
  { tables: 17, rounds: 8 },
  { tables: 19, rounds: 8 },
  { tables: 19, rounds: 9 },
];

const BOARDS_PER_ROUND = 3;

function build(tables: number, rounds: number): Tables<"PAIR"> {
  return generateWebMitchell({
    tables,
    rounds,
    boardsPerRound: BOARDS_PER_ROUND,
    web: true,
  });
}

describe("generateWebMitchell", () => {
  describe.each(TARGETS)("$tables tables / $rounds rounds", ({ tables, rounds }) => {
    const movement = build(tables, rounds);

    it("generates one entry per table", () => {
      expect(movement.tables).toHaveLength(tables);
    });

    it("generates the requested number of rounds at every table", () => {
      for (const table of movement.tables) {
        expect(table.rounds).toHaveLength(rounds);
      }
    });

    it("keeps NS pairs stationary at their own table", () => {
      for (const table of movement.tables) {
        const nsPairs = table.rounds.map((round) => round.participants.nsId);

        expect(new Set(nsPairs).size).toBe(1);
        expect(nsPairs[0]).toBe(`${table.table}NS`);
      }
    });

    it("uses exactly `rounds` distinct board sets across the field", () => {
      const setStarts = new Set<number>();

      for (const table of movement.tables) {
        for (const round of table.rounds) {
          // The first board number identifies the set.
          setStarts.add(round.boards[0]);
        }
      }

      expect(setStarts.size).toBe(rounds);
    });

    it("has distinct NS and EW pairs at every table each round", () => {
      for (let r = 0; r < rounds; r++) {
        const ns = movement.tables.map((t) => t.rounds[r].participants.nsId);
        const ew = movement.tables.map((t) => t.rounds[r].participants.ewId);

        expect(new Set(ns).size).toBe(tables);
        expect(new Set(ew).size).toBe(tables);
      }
    });

    it("never gives an NS pair the same opponent twice", () => {
      for (const table of movement.tables) {
        const opponents = table.rounds.map((round) => round.participants.ewId);

        expect(new Set(opponents).size).toBe(opponents.length);
      }
    });

    it("never lets an EW pair play the same board set twice", () => {
      // The Web's replay-free guarantee: follow each EW pair and confirm every
      // board set it plays is distinct. (For odd table counts the NS seats
      // deliberately replay set numbers on duplicate physical copies, which is
      // the point of a Web, so that invariant only holds for the EW pairs.)
      const ewBoards = new Map<string, number[]>();

      for (const table of movement.tables) {
        for (const round of table.rounds) {
          const { ewId } = round.participants;

          ewBoards.set(ewId, [...(ewBoards.get(ewId) ?? []), ...round.boards]);
        }
      }

      for (const boards of ewBoards.values()) {
        expect(new Set(boards).size).toBe(boards.length);
      }
    });

    if (tables % 2 === 0) {
      it("never lets an NS seat play the same board set twice (even Web)", () => {
        // Even-table Webs split into twin halves that share sets on duplicate
        // copies, and every seat still plays distinct set numbers.
        for (const table of movement.tables) {
          const boards = table.rounds.flatMap((round) => round.boards);

          expect(new Set(boards).size).toBe(boards.length);
        }
      });
    }
  });

  it("dispatches even table counts through the even construction", () => {
    // 12-table 8-round is the layout the even rule was verified against:
    // table 1 EW opponents follow the half-way skip move.
    const movement = build(12, 8);

    const table1 = movement.tables.find((t) => t.table === 1);

    expect(table1?.rounds.map((round) => round.participants.ewId)).toEqual([
      "1EW",
      "12EW",
      "11EW",
      "10EW",
      "8EW",
      "7EW",
      "6EW",
      "5EW",
    ]);
  });

  it("moves EW up one table per round for odd table counts", () => {
    const movement = build(13, 8);

    const table1 = movement.tables.find((t) => t.table === 1);

    expect(table1?.rounds.map((round) => round.participants.ewId)).toEqual([
      "1EW",
      "13EW",
      "12EW",
      "11EW",
      "10EW",
      "9EW",
      "8EW",
      "7EW",
    ]);
  });

  describe("board copies", () => {
    it("assigns copy A to the first half and B to the second (even Web)", () => {
      const tables = 14;
      const movement = build(tables, 8);
      const half = tables / 2;

      for (const table of movement.tables) {
        const expected = table.table <= half ? "A" : "B";
        for (const round of table.rounds) {
          expect(round.boardCopy).toBe(expected);
        }
      }
    });

    it("bands copies by table for odd Webs", () => {
      // 13 tables / 8 rounds: tables 1-8 -> A, tables 9-13 -> B.
      const movement = build(13, 8);

      for (const table of movement.tables) {
        const expected = table.table <= 8 ? "A" : "B";
        for (const round of table.rounds) {
          expect(round.boardCopy).toBe(expected);
        }
      }
    });

    it("keeps a table's copy constant across all its rounds", () => {
      const movement = build(16, 8);

      for (const table of movement.tables) {
        const copies = new Set(table.rounds.map((r) => r.boardCopy));
        expect(copies.size).toBe(1);
      }
    });

    it("falls back to copy 'A' when a table's band exceeds the label list", () => {
      // 13 tables / 3 rounds gives 5 bands (A,B,C,D then a 5th). Table 13 is
      // band index floor(12/3)=4, past the four COPY_LABELS, so it defaults
      // to "A" via the `?? "A"` fallback.
      const movement = build(13, 3);

      const table13 = movement.tables.find((t) => t.table === 13);
      expect(table13).toBeDefined();
      for (const round of table13!.rounds) {
        expect(round.boardCopy).toBe("A");
      }
    });
  });
});
