import { describe, expect, it } from "vitest";
import { generateDoubleHesitationMitchell } from "./double-hesitation-mitchell";
import { Tables } from "../../model/movement";

function boardSetsByPair(movement: Tables<"PAIR">): Map<string, string[]> {
  const byPair = new Map<string, string[]>();
  for (const table of movement.tables) {
    for (const round of table.rounds) {
      const set = round.boards.join(",");
      for (const pair of [round.participants.nsId, round.participants.ewId]) {
        byPair.set(pair, [...(byPair.get(pair) ?? []), set]);
      }
    }
  }
  return byPair;
}

function opponentsByPair(movement: Tables<"PAIR">): Map<string, string[]> {
  const byPair = new Map<string, string[]>();
  for (const table of movement.tables) {
    for (const round of table.rounds) {
      const { nsId, ewId } = round.participants;
      byPair.set(nsId, [...(byPair.get(nsId) ?? []), ewId]);
      byPair.set(ewId, [...(byPair.get(ewId) ?? []), nsId]);
    }
  }
  return byPair;
}

describe("generateDoubleHesitationMitchell (6 tables -> 8 rounds)", () => {
  const base = {
    tables: 6,
    rounds: 8,
    boardsPerRound: 3,
    doubleHesitation: true as const,
  };

  it("plays T+2 rounds", () => {
    for (const table of generateDoubleHesitationMitchell(base).tables) {
      expect(table.rounds).toHaveLength(8);
    }
  });

  it("uses T+2 board sets", () => {
    const result = generateDoubleHesitationMitchell(base);
    const sets = new Set<string>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        sets.add(round.boards.join(","));
      }
    }
    expect(sets.size).toBe(8);
  });

  it("keeps NS stationary at tables 1, 3, 4, 5 (pivots are 2 and 6)", () => {
    const result = generateDoubleHesitationMitchell(base);
    for (const t of [1, 3, 4, 5]) {
      const table = result.tables.find((x) => x.table === t);
      const ns = table?.rounds.map((r) => r.participants.nsId) ?? [];
      expect(new Set(ns)).toEqual(new Set([`${t}`]));
    }
    // Pivot tables have a changing NS occupant.
    for (const t of [2, 6]) {
      const table = result.tables.find((x) => x.table === t);
      const ns = table?.rounds.map((r) => r.participants.nsId) ?? [];
      expect(new Set(ns).size).toBeGreaterThan(1);
    }
  });

  it("matches the EBU canonical round-1 board layout", () => {
    // EBU: T1=1-3, T2=4-6, T3=7-9, T4=10-12, [relay 13-15], T5=16-18,
    // T6=19-21, [relay 22-24].
    const result = generateDoubleHesitationMitchell(base);
    const firsts = result.tables.map((t) => t.rounds[0].boards[0]);
    expect(firsts).toEqual([1, 4, 7, 10, 16, 19]);
  });

  it("never replays a board set for any pair", () => {
    const result = generateDoubleHesitationMitchell(base);
    for (const [, sets] of boardSetsByPair(result)) {
      expect(new Set(sets).size).toBe(sets.length);
    }
  });

  it("never gives a pair the same opponent twice", () => {
    const result = generateDoubleHesitationMitchell(base);
    for (const [, opponents] of opponentsByPair(result)) {
      expect(new Set(opponents).size).toBe(opponents.length);
    }
  });

  it("does not require board sharing (two relays absorb the spare sets)", () => {
    const result = generateDoubleHesitationMitchell(base);
    for (let r = 0; r < 8; r++) {
      const counts = new Map<string, number>();
      for (const table of result.tables) {
        const key = table.rounds[r].boards.join(",");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect(Math.max(...counts.values())).toBe(1);
    }
  });

  it("arrow switches non-pivot tables in the final round only", () => {
    const plain = generateDoubleHesitationMitchell(base);
    const switched = generateDoubleHesitationMitchell({
      ...base,
      arrowSwitchRounds: 1,
    });

    // Pivot tables (2 and 6) unchanged in the final round.
    for (const t of [2, 6]) {
      const p = plain.tables[t - 1].rounds[7].participants;
      const s = switched.tables[t - 1].rounds[7].participants;
      expect(s).toEqual(p);
    }
    // Non-pivot tables swap NS/EW in the final round.
    for (const t of [1, 3, 4, 5]) {
      const p = plain.tables[t - 1].rounds[7].participants;
      const s = switched.tables[t - 1].rounds[7].participants;
      expect(s.nsId).toBe(p.ewId);
      expect(s.ewId).toBe(p.nsId);
    }
  });
});

describe("generateDoubleHesitationMitchell modified variant", () => {
  const spec = {
    tables: 6,
    rounds: 8,
    boardsPerRound: 3,
    doubleHesitation: true as const,
  };

  it("differs from the standard circulation", () => {
    const std = generateDoubleHesitationMitchell(spec);
    const mod = generateDoubleHesitationMitchell({ ...spec, modified: true });
    expect(JSON.stringify(mod)).not.toBe(JSON.stringify(std));
  });

  it("still avoids board replays and opponent repeats", () => {
    const mod = generateDoubleHesitationMitchell({ ...spec, modified: true });
    for (const [, sets] of boardSetsByPair(mod)) {
      expect(new Set(sets).size).toBe(sets.length);
    }
    for (const [, opponents] of opponentsByPair(mod)) {
      expect(new Set(opponents).size).toBe(opponents.length);
    }
  });
});

describe("generateDoubleHesitationMitchell across table counts (even and odd)", () => {
  for (const tables of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    it(`is replay- and repeat-free for ${tables} tables`, () => {
      const result = generateDoubleHesitationMitchell({
        tables,
        rounds: tables + 2,
        boardsPerRound: 2,
        doubleHesitation: true,
      });
      for (const [, sets] of boardSetsByPair(result)) {
        expect(new Set(sets).size).toBe(sets.length);
      }
      for (const [, opponents] of opponentsByPair(result)) {
        expect(new Set(opponents).size).toBe(opponents.length);
      }
    });
  }

  it("uses T+2 board sets for an odd table count", () => {
    const result = generateDoubleHesitationMitchell({
      tables: 7,
      rounds: 9,
      boardsPerRound: 3,
      doubleHesitation: true,
    });
    const sets = new Set<string>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        sets.add(round.boards.join(","));
      }
    }
    expect(sets.size).toBe(9);
  });
});

describe("generateDoubleHesitationMitchell validation", () => {
  it("rejects fewer than 5 tables", () => {
    expect(() =>
      generateDoubleHesitationMitchell({
        tables: 4,
        rounds: 6,
        boardsPerRound: 3,
        doubleHesitation: true,
      }),
    ).toThrow("at least 5 tables");
  });

  it("accepts an odd number of tables", () => {
    expect(() =>
      generateDoubleHesitationMitchell({
        tables: 7,
        rounds: 9,
        boardsPerRound: 3,
        doubleHesitation: true,
      }),
    ).not.toThrow();
  });

  it("rejects the modified variant for an odd number of tables", () => {
    expect(() =>
      generateDoubleHesitationMitchell({
        tables: 7,
        rounds: 9,
        boardsPerRound: 3,
        doubleHesitation: true,
        modified: true,
      }),
    ).toThrow("even number of tables");
  });

  it("rejects a non-positive boardsPerRound", () => {
    expect(() =>
      generateDoubleHesitationMitchell({
        tables: 6,
        rounds: 8,
        boardsPerRound: 0,
        doubleHesitation: true,
      }),
    ).toThrow("boardsPerRound must be a positive integer");
  });
});
