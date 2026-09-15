import { describe, it, expect } from "vitest";
import {
  drawSwissRound,
  opponentKey,
  swissPairIds,
  swissRoundOne,
  type SwissDrawInput,
  type SwissHomeSeat,
  type SwissPairId,
} from "./swiss-pairing";

/** Build a played-opponents set from a list of matches. */
function played(pairs: [SwissPairId, SwissPairId][]): Set<string> {
  return new Set(pairs.map(([a, b]) => opponentKey(a, b)));
}

/** Minimal input with sensible empty defaults, overridable per test. */
function input(over: Partial<SwissDrawInput>): SwissDrawInput {
  return {
    tables: over.tables ?? 3,
    standings: over.standings ?? [],
    playedOpponents: over.playedOpponents ?? new Set(),
    hadBye: over.hadBye ?? new Set(),
    directionCounts: over.directionCounts ?? new Map(),
    stationary: over.stationary ?? new Map(),
  };
}

describe("swissPairIds", () => {
  it("numbers NS pairs first, then EW pairs", () => {
    expect(swissPairIds(3)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("swissRoundOne", () => {
  it("is positional: table T seats pair T (NS) vs pair tables+T (EW)", () => {
    expect(swissRoundOne(3)).toEqual([
      { tableNumber: 1, ns: 1, ew: 4 },
      { tableNumber: 2, ns: 2, ew: 5 },
      { tableNumber: 3, ns: 3, ew: 6 },
    ]);
  });
});

describe("opponentKey", () => {
  it("is order-independent", () => {
    expect(opponentKey(1, 4)).toBe(opponentKey(4, 1));
    expect(opponentKey(2, 5)).not.toBe(opponentKey(1, 4));
  });
});

describe("drawSwissRound — even field, no history", () => {
  it("pairs adjacent ranks (1v2, 3v4, ...)", () => {
    const result = drawSwissRound(
      input({ tables: 2, standings: [1, 2, 3, 4] }),
    );

    expect(result.sitOutPairId).toBeNull();
    expect(result.hadUnavoidableRepeat).toBe(false);
    expect(result.hadStationaryConflict).toBe(false);

    const matched = result.seating.map((s) =>
      opponentKey(s.ns, s.ew),
    );
    expect(matched).toContain(opponentKey(1, 2));
    expect(matched).toContain(opponentKey(3, 4));
    // Two tables occupied.
    expect(result.seating.map((s) => s.tableNumber).sort()).toEqual([1, 2]);
  });
});

describe("drawSwissRound — avoiding repeats", () => {
  it("skips a played pairing when a repeat-free draw exists", () => {
    // 1 already played 2; the engine should not re-pair 1v2.
    const result = drawSwissRound(
      input({
        tables: 2,
        standings: [1, 2, 3, 4],
        playedOpponents: played([
          [1, 2],
          [3, 4],
        ]),
      }),
    );

    const matched = result.seating.map((s) => opponentKey(s.ns, s.ew));
    expect(matched).not.toContain(opponentKey(1, 2));
    expect(matched).not.toContain(opponentKey(3, 4));
    expect(result.hadUnavoidableRepeat).toBe(false);
  });

  it("falls back to a repeat and flags it when no repeat-free draw exists", () => {
    // Only two pairs, and they have already played: a repeat is forced.
    const result = drawSwissRound(
      input({
        tables: 1,
        standings: [1, 2],
        playedOpponents: played([[1, 2]]),
      }),
    );

    expect(result.hadUnavoidableRepeat).toBe(true);
    expect(result.seating).toHaveLength(1);
    expect(opponentKey(result.seating[0].ns, result.seating[0].ew)).toBe(
      opponentKey(1, 2),
    );
  });
});

describe("drawSwissRound — odd field / bye", () => {
  it("sits out the lowest-ranked pair without a prior bye", () => {
    const result = drawSwissRound(
      input({ tables: 3, standings: [1, 2, 3, 4, 5] }),
    );

    // Lowest-ranked (5) sits out; four pairs seated at two tables.
    expect(result.sitOutPairId).toBe(5);
    expect(result.seating).toHaveLength(2);
  });

  it("skips a pair that has already had a bye", () => {
    const result = drawSwissRound(
      input({
        tables: 3,
        standings: [1, 2, 3, 4, 5],
        hadBye: new Set([5]),
      }),
    );

    // 5 already sat out, so the next-lowest without a bye (4) sits out.
    expect(result.sitOutPairId).toBe(4);
  });
});

describe("drawSwissRound — direction balancing", () => {
  it("puts the pair with the higher NS surplus into EW", () => {
    // Pair 1 has sat NS twice; pair 2 has sat EW twice. Pair 1 should now go EW.
    const result = drawSwissRound(
      input({
        tables: 1,
        standings: [1, 2],
        directionCounts: new Map([
          [1, { ns: 2, ew: 0 }],
          [2, { ns: 0, ew: 2 }],
        ]),
      }),
    );

    expect(result.seating[0]).toMatchObject({ ns: 2, ew: 1 });
  });
});

describe("drawSwissRound — stationary pairs", () => {
  it("keeps a stationary pair at its home table and direction", () => {
    const stationary = new Map<SwissPairId, SwissHomeSeat>([
      [1, { tableNumber: 1, direction: "NS" }],
    ]);

    const result = drawSwissRound(
      input({
        tables: 2,
        standings: [1, 2, 3, 4],
        stationary,
        // Give pair 1 an NS surplus so, absent the stationary rule, it would be
        // flipped to EW — proving the stationary anchor overrides balancing.
        directionCounts: new Map([[1, { ns: 3, ew: 0 }]]),
      }),
    );

    const homeTable = result.seating.find((s) => s.tableNumber === 1)!;
    expect(homeTable.ns).toBe(1); // stayed NS at table 1
    expect(result.hadStationaryConflict).toBe(false);
  });

  it("flags a conflict when two stationary pairs must meet", () => {
    const stationary = new Map<SwissPairId, SwissHomeSeat>([
      [1, { tableNumber: 1, direction: "NS" }],
      [2, { tableNumber: 2, direction: "NS" }],
    ]);

    // Only pairs 1 and 2 exist and both are stationary: they must meet.
    const result = drawSwissRound(
      input({ tables: 1, standings: [1, 2], stationary }),
    );

    expect(result.hadStationaryConflict).toBe(true);
    expect(result.seating).toHaveLength(1);
  });
});

describe("drawSwissRound — completeness", () => {
  it("seats every non-sit-out pair exactly once", () => {
    const result = drawSwissRound(
      input({ tables: 3, standings: [1, 2, 3, 4, 5, 6] }),
    );

    const seated = result.seating.flatMap((s) => [s.ns, s.ew]).sort();
    expect(seated).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
