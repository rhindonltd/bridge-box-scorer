import { describe, expect, it } from "vitest";
import { generateAmericanWhistMitchell } from "./american-whist-mitchell";

describe("generateAmericanWhistMitchell", () => {
  it("reproduces the fandom 5-table / 5-boards reference layout", () => {
    const result = generateAmericanWhistMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
      americanWhist: true,
    });

    // Board sets: set S = boards (S-1)*5+1 .. S*5.
    const set = (s: number): number[] => [1, 2, 3, 4, 5].map((i) => (s - 1) * 5 + i);

    // Expected EW pair id and board set per (table, round), transcribed from
    // the bridge.fandom.com American Whist 5-team example (round 1 = the
    // initial shuffle-row layout: EW pair T and set T at table T).
    //
    // Per table: [round1, round2, round3, round4, round5], each { ew, set }.
    const expected: Record<number, { ew: number; set: number }[]> = {
      1: [
        { ew: 1, set: 1 },
        { ew: 3, set: 2 },
        { ew: 5, set: 3 },
        { ew: 2, set: 4 },
        { ew: 4, set: 5 },
      ],
      2: [
        { ew: 2, set: 2 },
        { ew: 4, set: 3 },
        { ew: 1, set: 4 },
        { ew: 3, set: 5 },
        { ew: 5, set: 1 },
      ],
      3: [
        { ew: 3, set: 3 },
        { ew: 5, set: 4 },
        { ew: 2, set: 5 },
        { ew: 4, set: 1 },
        { ew: 1, set: 2 },
      ],
      4: [
        { ew: 4, set: 4 },
        { ew: 1, set: 5 },
        { ew: 3, set: 1 },
        { ew: 5, set: 2 },
        { ew: 2, set: 3 },
      ],
      5: [
        { ew: 5, set: 5 },
        { ew: 2, set: 1 },
        { ew: 4, set: 2 },
        { ew: 1, set: 3 },
        { ew: 3, set: 4 },
      ],
    };

    for (const table of result.tables) {
      const rows = expected[table.table];
      expect(table.rounds.map((r) => r.participants.ewId)).toEqual(
        rows.map((row) => `${row.ew}EW`),
      );
      expect(table.rounds.map((r) => r.participants.nsId)).toEqual(
        Array(5).fill(`${table.table}NS`),
      );
      expect(table.rounds.map((r) => r.boards)).toEqual(
        rows.map((row) => set(row.set)),
      );
    }
  });

  it("plays a team's two encounters on the same boards (teams board-sharing)", () => {
    // The AWL movement is used for teams: the NS pair and EW pair with the same
    // number are one team. For teams i and j to be comparable, the encounter
    // "NS table i vs EW pair j" must play the SAME board set as the mirror
    // encounter "NS table j vs EW pair i" (each team's two partnerships meeting
    // the other team's two partnerships on the same deals).
    for (const tables of [5, 7, 9]) {
      const result = generateAmericanWhistMitchell({
        tables,
        rounds: tables,
        boardsPerRound: 2,
        americanWhist: true,
      });

      // Boards played when NS table `i` hosts EW pair `j` (as a "start-end"
      // key), or null if they never meet.
      const boardsWhenMeets = (i: number, j: number): string | null => {
        const table = result.tables.find((t) => t.table === i);
        const round = table?.rounds.find(
          (r) => r.participants.ewId === `${j}EW`,
        );
        return round ? `${round.boards[0]}-${round.boards.at(-1)}` : null;
      };

      for (let i = 1; i <= tables; i++) {
        for (let j = 1; j <= tables; j++) {
          if (i === j) continue;
          const forward = boardsWhenMeets(i, j);
          const mirror = boardsWhenMeets(j, i);
          expect(forward).not.toBeNull();
          expect(mirror).not.toBeNull();
          // NS i vs EW j plays the same boards as NS j vs EW i.
          expect(forward).toBe(mirror);
        }
      }
    }
  });

  it("gives every NS table a unique EW opponent in every round", () => {
    const result = generateAmericanWhistMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 3,
      americanWhist: true,
    });

    for (const table of result.tables) {
      const opponents = table.rounds.map((r) => r.participants.ewId);
      expect(new Set(opponents).size).toBe(5);
    }
  });

  it("keeps NS stationary at its own table", () => {
    const result = generateAmericanWhistMitchell({
      tables: 7,
      rounds: 7,
      boardsPerRound: 2,
      americanWhist: true,
    });

    for (const table of result.tables) {
      expect(table.rounds.map((r) => r.participants.nsId)).toEqual(
        Array(7).fill(`${table.table}NS`),
      );
    }
  });

  it("covers every board exactly once per table-round product", () => {
    const result = generateAmericanWhistMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 5,
      americanWhist: true,
    });

    const allBoards = result.tables.flatMap((table) =>
      table.rounds.flatMap((round) => round.boards),
    );

    expect(allBoards).toHaveLength(5 * 5 * 5);

    const counts = new Map<number, number>();
    for (const board of allBoards) {
      counts.set(board, (counts.get(board) ?? 0) + 1);
    }
    // 25 distinct boards, each played once per table => 5 times across tables.
    expect(counts.size).toBe(25);
    for (const count of counts.values()) {
      expect(count).toBe(5);
    }
  });

  it("rejects an even number of tables", () => {
    expect(() =>
      generateAmericanWhistMitchell({
        tables: 6,
        rounds: 6,
        boardsPerRound: 2,
        americanWhist: true,
      }),
    ).toThrow("American Whist requires an odd number of tables");
  });

  it("rejects more rounds than tables (shared Mitchell validation)", () => {
    expect(() =>
      generateAmericanWhistMitchell({
        tables: 5,
        rounds: 6,
        boardsPerRound: 3,
        americanWhist: true,
      }),
    ).toThrow("A Mitchell cannot have more rounds than tables");
  });

  it("rejects a single-round movement (shared Mitchell validation)", () => {
    expect(() =>
      generateAmericanWhistMitchell({
        tables: 5,
        rounds: 1,
        boardsPerRound: 3,
        americanWhist: true,
      }),
    ).toThrow("A Mitchell must have at least 2 rounds");
  });

  it("applies one-winner numbering with a trailing arrow switch", () => {
    const result = generateAmericanWhistMitchell({
      tables: 5,
      rounds: 5,
      boardsPerRound: 3,
      arrowSwitchRounds: 1,
      americanWhist: true,
    });

    const table1 = result.tables.find((t) => t.table === 1);

    // Rounds 1-4: NS is table 1, EW is the moving pair numbered after the NS
    // block (ewTable + tables). ewTable at table 1 is 1,3,5,2 across rounds 1-4.
    expect(
      table1?.rounds
        .slice(0, 4)
        .map((r) => [r.participants.nsId, r.participants.ewId]),
    ).toEqual([
      ["1", "6"],
      ["1", "8"],
      ["1", "10"],
      ["1", "7"],
    ]);

    // Final round is arrow-switched: the pairs swap direction. ewTable at
    // table 1 round 5 is 4 => moving pair 9; it now sits NS, table 1 sits EW.
    expect(
      table1?.rounds
        .slice(4)
        .map((r) => [r.participants.nsId, r.participants.ewId]),
    ).toEqual([["9", "1"]]);
  });
});
