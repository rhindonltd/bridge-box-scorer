import { describe, expect, it } from "vitest";
import { generateHesitationMitchell } from "./hesitation-mitchell";
import { Tables } from "../../model/movement";

/** All (pair -> board sets played) across the whole movement. */
function boardSetsByPair(movement: Tables<"PAIR">): Map<string, string[]> {
  const byPair = new Map<string, string[]>();
  for (const table of movement.tables) {
    for (const round of table.rounds) {
      const set = round.boards.join(",");
      for (const pair of [round.participants.nsId, round.participants.ewId]) {
        const arr = byPair.get(pair) ?? [];
        arr.push(set);
        byPair.set(pair, arr);
      }
    }
  }
  return byPair;
}

/** All (pair -> opponents met) across the whole movement. */
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

describe("generateHesitationMitchell (7 tables -> 8 rounds)", () => {
  const base = {
    tables: 7,
    rounds: 8,
    boardsPerRound: 3,
    hesitation: true as const,
  };

  it("generates one row per table", () => {
    expect(generateHesitationMitchell(base).tables).toHaveLength(7);
  });

  it("plays T+1 rounds", () => {
    for (const table of generateHesitationMitchell(base).tables) {
      expect(table.rounds).toHaveLength(8);
    }
  });

  it("keeps NS pairs stationary at tables 1..T-1", () => {
    const result = generateHesitationMitchell(base);
    for (let t = 1; t < 7; t++) {
      const table = result.tables.find((x) => x.table === t);
      const ns = table?.rounds.map((r) => r.participants.nsId) ?? [];
      expect(new Set(ns)).toEqual(new Set([`${t}`]));
    }
  });

  it("uses T+1 distinct board sets", () => {
    const result = generateHesitationMitchell(base);
    const sets = new Set<string>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        sets.add(round.boards.join(","));
      }
    }
    expect(sets.size).toBe(8);
  });

  it("never replays a board set for any pair (NS or EW origin)", () => {
    const result = generateHesitationMitchell(base);
    for (const [, sets] of boardSetsByPair(result)) {
      expect(new Set(sets).size).toBe(sets.length);
    }
  });

  it("has each moving pair hesitate NS at the pivot exactly once", () => {
    const result = generateHesitationMitchell(base);
    const pivot = result.tables.find((t) => t.table === 7);

    // The pivot NS seat is occupied by a different moving pair each round.
    const pivotNsPairs = pivot?.rounds.map((r) => r.participants.nsId) ?? [];
    expect(new Set(pivotNsPairs).size).toBe(pivotNsPairs.length);
  });

  it("never gives a pair the same opponent twice (one-winner, no switch)", () => {
    const result = generateHesitationMitchell(base);
    for (const [, opponents] of opponentsByPair(result)) {
      expect(new Set(opponents).size).toBe(opponents.length);
    }
  });

  it("numbers pairs with the block scheme (NS 1..T, EW T+1..2T)", () => {
    const result = generateHesitationMitchell(base);
    const round1 = result.tables.map((t) => t.rounds[0].participants);
    // Table 1 round 1: NS 1, EW 8 (1 + tables).
    expect(round1[0]).toEqual({ nsId: "1", ewId: "8" });
  });

  it("matches the EBU canonical round-1 board layout (single relay)", () => {
    // EBU: T1=1-3, T2=4-6, T3=7-9, [relay 10-12], T4=13-15, T5=16-18,
    // T6=19-21, T7=22-24.
    const result = generateHesitationMitchell(base);
    const round1Firsts = result.tables.map((t) => t.rounds[0].boards[0]);
    expect(round1Firsts).toEqual([1, 4, 7, 13, 16, 19, 22]);
  });

  it("never shares boards for an odd table count (single relay)", () => {
    const result = generateHesitationMitchell(base);
    for (let r = 0; r < 8; r++) {
      const counts = new Map<string, number>();
      for (const table of result.tables) {
        const key = table.rounds[r].boards.join(",");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      expect(Math.max(...counts.values())).toBe(1);
    }
  });

  it("arrow switches every non-pivot table in the final round only", () => {
    const plain = generateHesitationMitchell(base);
    const switched = generateHesitationMitchell({
      ...base,
      arrowSwitchRounds: 1,
    });

    // Pivot (table 7) unchanged in the final round.
    const pivotPlain = plain.tables[6].rounds[7].participants;
    const pivotSwitched = switched.tables[6].rounds[7].participants;
    expect(pivotSwitched).toEqual(pivotPlain);

    // Non-pivot tables: NS/EW swapped in the final round.
    for (let t = 0; t < 6; t++) {
      const p = plain.tables[t].rounds[7].participants;
      const s = switched.tables[t].rounds[7].participants;
      expect(s.nsId).toBe(p.ewId);
      expect(s.ewId).toBe(p.nsId);
    }

    // Earlier rounds untouched.
    for (let t = 0; t < 7; t++) {
      expect(switched.tables[t].rounds[0]).toEqual(plain.tables[t].rounds[0]);
    }
  });

  it("still avoids opponent repeats with an arrow switch applied", () => {
    const result = generateHesitationMitchell({
      ...base,
      arrowSwitchRounds: 1,
    });
    for (const [, opponents] of opponentsByPair(result)) {
      expect(new Set(opponents).size).toBe(opponents.length);
    }
  });
});

describe("generateHesitationMitchell (even tables)", () => {
  const base = {
    tables: 8,
    rounds: 9,
    boardsPerRound: 3,
    hesitation: true as const,
  };

  it("plays T+1 rounds with T+1 board sets", () => {
    const result = generateHesitationMitchell(base);
    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(9);
    }
    const sets = new Set<string>();
    for (const table of result.tables) {
      for (const round of table.rounds) {
        sets.add(round.boards.join(","));
      }
    }
    expect(sets.size).toBe(9);
  });

  it("matches the EBU canonical round-1 layout with table 1 and 8 sharing", () => {
    // EBU: T1=1-3, T2=4-6, T3=7-9, T4=10-12, [relay 13-18], T5=19-21,
    // T6=22-24, T7=25-27, T8=1-3 (shares with T1).
    const result = generateHesitationMitchell(base);
    const round1Firsts = result.tables.map((t) => t.rounds[0].boards[0]);
    expect(round1Firsts).toEqual([1, 4, 7, 10, 19, 22, 25, 1]);

    // Tables 1 and 8 share the same boards every round.
    const t1 = result.tables.find((t) => t.table === 1);
    const t8 = result.tables.find((t) => t.table === 8);
    expect(t1?.rounds.map((r) => r.boards)).toEqual(
      t8?.rounds.map((r) => r.boards),
    );
  });

  it("shares boards for even tables (a set played by two tables a round)", () => {
    const result = generateHesitationMitchell(base);
    let maxShare = 0;
    for (let r = 0; r < 9; r++) {
      const counts = new Map<string, number>();
      for (const table of result.tables) {
        const key = table.rounds[r].boards.join(",");
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      maxShare = Math.max(maxShare, ...counts.values());
    }
    expect(maxShare).toBe(2);
  });

  it("never replays a board set for any pair", () => {
    const result = generateHesitationMitchell(base);
    for (const [, sets] of boardSetsByPair(result)) {
      expect(new Set(sets).size).toBe(sets.length);
    }
  });

  it("never gives a pair the same opponent twice", () => {
    const result = generateHesitationMitchell(base);
    for (const [, opponents] of opponentsByPair(result)) {
      expect(new Set(opponents).size).toBe(opponents.length);
    }
  });
});

describe("generateHesitationMitchell validation", () => {
  it("rejects fewer than 3 tables", () => {
    expect(() =>
      generateHesitationMitchell({
        tables: 2,
        rounds: 3,
        boardsPerRound: 3,
        hesitation: true,
      }),
    ).toThrow("at least 3 tables");
  });
});
