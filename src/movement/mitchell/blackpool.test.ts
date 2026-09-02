import { describe, expect, it } from "vitest";
import { generateBlackpool } from "./blackpool";

describe("generateBlackpool", () => {
  const base = {
    tables: 12,
    rounds: 12,
    boardsPerRound: 2,
    blackpool: true as const,
  };

  it("generates one row per table", () => {
    const result = generateBlackpool(base);
    expect(result.tables).toHaveLength(12);
  });

  it("plays T rounds with no revenge round", () => {
    const result = generateBlackpool(base);
    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(12);
    }
  });

  it("keeps NS pairs stationary (two-winner)", () => {
    const result = generateBlackpool(base);
    for (const table of result.tables) {
      const ns = table.rounds.map((r) => r.participants.nsId);
      expect(new Set(ns).size).toBe(1);
      expect(ns[0]).toBe(`${table.table}NS`);
    }
  });

  it("moves EW down one table each round", () => {
    const result = generateBlackpool(base);
    const table1 = result.tables.find((t) => t.table === 1);
    expect(table1?.rounds.map((r) => r.participants.ewId)).toEqual([
      "1EW",
      "12EW",
      "11EW",
      "10EW",
      "9EW",
      "8EW",
      "7EW",
      "6EW",
      "5EW",
      "4EW",
      "3EW",
      "2EW",
    ]);
  });

  it("uses T+2 distinct board sets across the movement", () => {
    const result = generateBlackpool(base);
    const setsSeen = new Set<string>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        setsSeen.add(round.boards.join(","));
      }
    }
    expect(setsSeen.size).toBe(14); // 12 + 2
  });

  it("never replays a board set for any NS pair", () => {
    const result = generateBlackpool(base);
    for (const table of result.tables) {
      const sets = table.rounds.map((r) => r.boards.join(","));
      expect(new Set(sets).size).toBe(sets.length);
    }
  });

  it("never replays a board set for any EW pair", () => {
    const result = generateBlackpool(base);

    // Track each EW pair's board sets across the rounds it appears in.
    const setsByEw = new Map<string, string[]>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        const ew = round.participants.ewId;
        const arr = setsByEw.get(ew) ?? [];
        arr.push(round.boards.join(","));
        setsByEw.set(ew, arr);
      }
    }

    for (const sets of setsByEw.values()) {
      expect(new Set(sets).size).toBe(sets.length);
    }
  });

  it("leaves two board sets unplayed by any given pair", () => {
    // Each NS pair plays exactly T of the T+2 sets, so two are unplayed.
    const result = generateBlackpool(base);
    const table1 = result.tables.find((t) => t.table === 1);
    const played = new Set(table1?.rounds.map((r) => r.boards.join(",")));
    expect(played.size).toBe(12);
  });

  it("hand-verified board layout for a 4-table Blackpool", () => {
    const result = generateBlackpool({
      tables: 4,
      rounds: 4,
      boardsPerRound: 3,
      blackpool: true,
    });

    // Round 1 slot assignment over the 6-set ring:
    //   T1 -> set 1 (1-3), T2 -> set 2 (4-6), relay -> set 3,
    //   T3 -> set 4 (10-12), T4 -> set 5 (13-15), relay -> set 6.
    const round1 = (t: number) =>
      result.tables.find((x) => x.table === t)?.rounds[0].boards;

    expect(round1(1)).toEqual([1, 2, 3]);
    expect(round1(2)).toEqual([4, 5, 6]);
    expect(round1(3)).toEqual([10, 11, 12]);
    expect(round1(4)).toEqual([13, 14, 15]);
  });

  it("supports an odd number of tables (double relay)", () => {
    const result = generateBlackpool({
      tables: 5,
      rounds: 5,
      boardsPerRound: 4,
      blackpool: true,
    });

    expect(result.tables).toHaveLength(5);
    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(5);
      const sets = table.rounds.map((r) => r.boards.join(","));
      expect(new Set(sets).size).toBe(5); // no NS replay
    }

    const setsSeen = new Set<string>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        setsSeen.add(round.boards.join(","));
      }
    }
    expect(setsSeen.size).toBe(7); // 5 + 2
  });

  it("plays a revenge round that re-meets an earlier opponent", () => {
    const result = generateBlackpool({
      tables: 6,
      rounds: 6,
      boardsPerRound: 2,
      blackpool: true,
      revengeRounds: 1,
    });

    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(7);
    }

    // Table 1's EW opponents: round 1 is 1EW; after a full cycle the revenge
    // round (round 7) re-meets 1EW.
    const table1 = result.tables.find((t) => t.table === 1);
    const opponents = table1?.rounds.map((r) => r.participants.ewId) ?? [];
    expect(opponents[0]).toBe("1EW");
    expect(opponents[6]).toBe("1EW");
  });

  it("supports a one-winner arrow switch", () => {
    const result = generateBlackpool({
      tables: 6,
      rounds: 6,
      boardsPerRound: 2,
      blackpool: true,
      arrowSwitchRounds: 1,
    });

    const table1 = result.tables.find((t) => t.table === 1);
    // Before the switch, block numbering (NS 1, EW = ewTable + tables).
    expect(table1?.rounds[0].participants).toEqual({ nsId: "1", ewId: "7" });
    // Final round is arrow switched: NS/EW identities swap direction.
    const last = table1?.rounds[5].participants;
    expect(last?.ewId).toBe("1");
  });

  it("rejects fewer than 2 tables", () => {
    expect(() =>
      generateBlackpool({
        tables: 1,
        rounds: 1,
        boardsPerRound: 2,
        blackpool: true,
      }),
    ).toThrow("Blackpool requires at least 2 tables");
  });

  it("rejects more than 2 revenge rounds", () => {
    expect(() =>
      generateBlackpool({
        tables: 6,
        rounds: 6,
        boardsPerRound: 2,
        blackpool: true,
        revengeRounds: 3,
      }),
    ).toThrow("at most 2 revenge rounds");
  });
});
