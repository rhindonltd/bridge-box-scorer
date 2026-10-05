import { describe, it, expect } from "vitest";
import {
  drawSwissRound,
  opponentKey,
  swissPairIds,
  swissPairHomeSeat,
  swissPairIdFromHomeSeat,
  swissRoundOne,
  swapPairs,
  reassignBye,
  seatedPairIds,
  evaluateSwissSeating,
  chooseHalfMatchGroup,
  halfMatchGroupIds,
  reanchorHalfMatchGroup,
  type SwissDrawInput,
  type SwissHalfMatchGroup,
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
    hadHalfMatch: over.hadHalfMatch,
    oddHandling: over.oddHandling,
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

describe("swissPairHomeSeat / swissPairIdFromHomeSeat", () => {
  it("maps low ids to NS homes and high ids to EW homes", () => {
    // 3 tables: pairs 1..3 start NS at their own table; 4..6 start EW.
    expect(swissPairHomeSeat(3, 1)).toEqual({
      tableNumber: 1,
      direction: "NS",
    });
    expect(swissPairHomeSeat(3, 3)).toEqual({
      tableNumber: 3,
      direction: "NS",
    });
    expect(swissPairHomeSeat(3, 4)).toEqual({
      tableNumber: 1,
      direction: "EW",
    });
    expect(swissPairHomeSeat(3, 6)).toEqual({
      tableNumber: 3,
      direction: "EW",
    });
  });

  it("is the exact inverse of the home-seat mapping", () => {
    for (let id = 1; id <= 6; id++) {
      expect(swissPairIdFromHomeSeat(3, swissPairHomeSeat(3, id))).toBe(id);
    }
    // And directly: NS home at table T is pair T; EW home is tables + T.
    expect(
      swissPairIdFromHomeSeat(3, { tableNumber: 2, direction: "NS" }),
    ).toBe(2);
    expect(
      swissPairIdFromHomeSeat(3, { tableNumber: 2, direction: "EW" }),
    ).toBe(5);
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

    const matched = result.seating.map((s) => opponentKey(s.ns, s.ew));
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

  it("prunes inferior branches and stops at the first repeat-free draw (larger field)", () => {
    // Six pairs. The nearest-rank partner for several pairs has already been
    // played, forcing the search to explore repeat branches (which get pruned)
    // before it settles on a fully repeat-free assignment.
    const result = drawSwissRound(
      input({
        tables: 3,
        standings: [1, 2, 3, 4, 5, 6],
        playedOpponents: played([
          [1, 2],
          [3, 4],
          [5, 6],
        ]),
      }),
    );

    expect(result.hadUnavoidableRepeat).toBe(false);
    const keys = result.seating.map((s) => opponentKey(s.ns, s.ew));
    // None of the already-played adjacent pairings recur.
    expect(keys).not.toContain(opponentKey(1, 2));
    expect(keys).not.toContain(opponentKey(3, 4));
    expect(keys).not.toContain(opponentKey(5, 6));
    // Everyone is still seated exactly once.
    const seated = result.seating.flatMap((s) => [s.ns, s.ew]).sort();
    expect(seated).toEqual([1, 2, 3, 4, 5, 6]);
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

  it("falls back to the lowest-ranked pair when everyone has had a bye", () => {
    // Every pair has already sat out; the engine still produces a draw by
    // giving the bye to the lowest-ranked pair (3).
    const result = drawSwissRound(
      input({
        tables: 2,
        standings: [1, 2, 3],
        hadBye: new Set([1, 2, 3]),
      }),
    );

    expect(result.sitOutPairId).toBe(3);
    expect(result.seating).toHaveLength(1);
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

  it("puts the other pair into EW when it has the higher NS surplus", () => {
    // Mirror of the above: pair 2 has the NS surplus, so pair 2 goes EW.
    const result = drawSwissRound(
      input({
        tables: 1,
        standings: [1, 2],
        directionCounts: new Map([
          [1, { ns: 0, ew: 2 }],
          [2, { ns: 2, ew: 0 }],
        ]),
      }),
    );

    expect(result.seating[0]).toMatchObject({ ns: 1, ew: 2 });
  });

  it("breaks a direction tie by seating the higher-ranked pair NS", () => {
    // Equal surplus (both zero): the earlier/higher-ranked id sits NS.
    const result = drawSwissRound(input({ tables: 1, standings: [1, 2] }));

    expect(result.seating[0]).toMatchObject({ ns: 1, ew: 2 });
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

  it("anchors on the second pair when only it is stationary", () => {
    // Only pair 2 (the higher-ranked-second id in the match) is stationary, so
    // the anchor is match.b and pair 1 becomes the travelling opponent.
    const stationary = new Map<SwissPairId, SwissHomeSeat>([
      [2, { tableNumber: 2, direction: "NS" }],
    ]);

    const result = drawSwissRound(
      input({ tables: 1, standings: [1, 2], stationary }),
    );

    const homeTable = result.seating.find((s) => s.tableNumber === 2)!;
    expect(homeTable.ns).toBe(2); // pair 2 stayed NS at its home table 2
    expect(homeTable.ew).toBe(1); // pair 1 travelled in
    expect(result.hadStationaryConflict).toBe(false);
  });

  it("seats a stationary pair whose home direction is EW", () => {
    const stationary = new Map<SwissPairId, SwissHomeSeat>([
      [1, { tableNumber: 1, direction: "EW" }],
    ]);

    const result = drawSwissRound(
      input({ tables: 2, standings: [1, 2, 3, 4], stationary }),
    );

    const homeTable = result.seating.find((s) => s.tableNumber === 1)!;
    // The anchor keeps its EW home; the opponent takes NS at the same table.
    expect(homeTable.ew).toBe(1);
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

  it("flags a conflict when two stationary pairs share the same home table", () => {
    // Pairs 1 and 3 are both anchored to table 1 but are drawn against
    // different opponents (1v2, 3v4). The second can't take its home table, so
    // it is re-seated elsewhere and the conflict is flagged.
    const stationary = new Map<SwissPairId, SwissHomeSeat>([
      [1, { tableNumber: 1, direction: "NS" }],
      [3, { tableNumber: 1, direction: "NS" }],
    ]);

    const result = drawSwissRound(
      input({
        tables: 2,
        standings: [1, 2, 3, 4],
        stationary,
        playedOpponents: played([
          [1, 3],
          [2, 4],
        ]),
      }),
    );

    expect(result.hadStationaryConflict).toBe(true);
    // Every pair is still seated exactly once across the two tables.
    const seated = result.seating.flatMap((s) => [s.ns, s.ew]).sort();
    expect(seated).toEqual([1, 2, 3, 4]);
  });
});

describe("drawSwissRound — odd field / 2 half matches", () => {
  it("produces a half-match group (not a bye) when oddHandling is HALF_MATCHES", () => {
    // 3 tables, 5 pairs (odd). The three lowest-ranked (3, 4, 5) form the group;
    // the rest (1, 2) play an ordinary match.
    const result = drawSwissRound(
      input({
        tables: 3,
        standings: [1, 2, 3, 4, 5],
        oddHandling: "HALF_MATCHES",
      }),
    );

    expect(result.sitOutPairId).toBeNull();
    expect(result.halfMatch).not.toBeNull();
    const hm = result.halfMatch!;
    // The group's three pairs are the lowest-ranked three.
    const groupIds = [
      hm.group.anchor,
      hm.group.halfOneOpponent,
      hm.group.halfTwoOpponent,
    ].sort();
    expect(groupIds).toEqual([3, 4, 5]);
    // The anchor is the best-standing of the three (3).
    expect(hm.group.anchor).toBe(3);
    // The three group pairs are NOT in the ordinary seating.
    const seated = result.seating.flatMap((s) => [s.ns, s.ew]);
    for (const id of groupIds) expect(seated).not.toContain(id);
    // The remaining pairs (1, 2) are seated.
    expect(seated.sort()).toEqual([1, 2]);
    // The anchor's table is distinct from the ordinary tables.
    const ordinaryTables = result.seating.map((s) => s.tableNumber);
    expect(ordinaryTables).not.toContain(hm.anchorTable);
  });

  it("falls back to a bye when the field is odd but oddHandling is BYE", () => {
    const result = drawSwissRound(
      input({ tables: 3, standings: [1, 2, 3, 4, 5], oddHandling: "BYE" }),
    );
    expect(result.halfMatch).toBeNull();
    expect(result.sitOutPairId).not.toBeNull();
  });

  it("ignores HALF_MATCHES for an even field (ordinary round)", () => {
    const result = drawSwissRound(
      input({ tables: 2, standings: [1, 2, 3, 4], oddHandling: "HALF_MATCHES" }),
    );
    expect(result.halfMatch).toBeNull();
    expect(result.sitOutPairId).toBeNull();
  });

  it("anchors a stationary group member at its home seat", () => {
    // Pair 5 is stationary at table 3 EW; it is in the group (3,4,5) and must
    // anchor there even though pair 3 is better-standing.
    const stationary = new Map<SwissPairId, SwissHomeSeat>([
      [5, { tableNumber: 3, direction: "EW" }],
    ]);
    const result = drawSwissRound(
      input({
        tables: 3,
        standings: [1, 2, 3, 4, 5],
        oddHandling: "HALF_MATCHES",
        stationary,
      }),
    );

    const hm = result.halfMatch!;
    expect(hm.group.anchor).toBe(5);
    expect(hm.anchorTable).toBe(3);
    expect(hm.anchorDirection).toBe("EW");
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

describe("swapPairs", () => {
  const seating = [
    { tableNumber: 1, ns: 1, ew: 4 },
    { tableNumber: 2, ns: 2, ew: 5 },
    { tableNumber: 3, ns: 3, ew: 6 },
  ];

  it("exchanges the seats of two pairs, leaving others untouched", () => {
    // Swap pair 4 (table 1 EW) and pair 2 (table 2 NS).
    const out = swapPairs(seating, 4, 2);
    expect(out).toEqual([
      { tableNumber: 1, ns: 1, ew: 2 },
      { tableNumber: 2, ns: 4, ew: 5 },
      { tableNumber: 3, ns: 3, ew: 6 },
    ]);
    // The input is not mutated.
    expect(seating[0]).toEqual({ tableNumber: 1, ns: 1, ew: 4 });
  });

  it("returns an unchanged copy when swapping a pair with itself", () => {
    expect(swapPairs(seating, 3, 3)).toEqual(seating);
  });

  it("returns an unchanged copy when a pair is not seated (e.g. the bye)", () => {
    // Pair 99 is not in the seating.
    expect(swapPairs(seating, 1, 99)).toEqual(seating);
  });

  it("keeps every pair seated exactly once after a swap", () => {
    const out = swapPairs(seating, 1, 6);
    expect([...seatedPairIds(out)].sort((a: number, b: number) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});

describe("reassignBye", () => {
  // 3-table odd field would have 5 pairs; model a 2-table field (4 pairs) with
  // one extra pair (5) sitting out.
  const seating = [
    { tableNumber: 1, ns: 1, ew: 3 },
    { tableNumber: 2, ns: 2, ew: 4 },
  ];

  it("swaps the sit-out pair in for the chosen seated pair", () => {
    // Pair 5 sits out; make pair 2 sit out instead — pair 5 takes pair 2's seat.
    const { seating: out, sitOutPairId } = reassignBye(seating, 5, 2);
    expect(sitOutPairId).toBe(2);
    expect(out).toEqual([
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 5, ew: 4 },
    ]);
  });

  it("no-ops when there is no current sit-out (even field)", () => {
    const { seating: out, sitOutPairId } = reassignBye(seating, null, 2);
    expect(out).toEqual(seating);
    expect(sitOutPairId).toBe(2);
  });

  it("no-ops when the incoming sit-out is not seated", () => {
    const { seating: out, sitOutPairId } = reassignBye(seating, 5, 99);
    expect(out).toEqual(seating);
    expect(sitOutPairId).toBe(5);
  });
});

describe("evaluateSwissSeating", () => {
  const seating = [
    { tableNumber: 1, ns: 1, ew: 4 },
    { tableNumber: 2, ns: 2, ew: 5 },
    { tableNumber: 3, ns: 3, ew: 6 },
  ];

  it("reports a clean arrangement with no advisories", () => {
    const a = evaluateSwissSeating(seating, null, input({ tables: 3 }));
    expect(a.structuralError).toBe(false);
    expect(a.hadUnavoidableRepeat).toBe(false);
    expect(a.hadStationaryConflict).toBe(false);
    expect(a.byeRepeat).toBe(false);
    expect(a.problemTables).toEqual([]);
  });

  it("flags a repeat pairing against history and names the table", () => {
    const a = evaluateSwissSeating(
      seating,
      null,
      input({ tables: 3, playedOpponents: played([[1, 4]]) }),
    );
    expect(a.hadUnavoidableRepeat).toBe(true);
    expect(a.repeats).toContain(opponentKey(1, 4));
    // Pair 1 v 4 is seated at table 1, so table 1 is flagged.
    expect(a.problemTables).toEqual([1]);
  });

  it("flags a structural error when a pair is seated twice", () => {
    const bad = [
      { tableNumber: 1, ns: 1, ew: 4 },
      { tableNumber: 2, ns: 1, ew: 5 }, // pair 1 seated twice; pair 2 missing
      { tableNumber: 3, ns: 3, ew: 6 },
    ];
    const a = evaluateSwissSeating(bad, null, input({ tables: 3 }));
    expect(a.structuralError).toBe(true);
    expect(a.structuralReasons.some((r: string) => r.includes("Pair 1"))).toBe(
      true,
    );
    expect(a.structuralReasons.some((r: string) => r.includes("Pair 2"))).toBe(
      true,
    );
  });

  it("flags a bye repeat when the sit-out pair already had a bye", () => {
    // 2-table field (4 pairs) with pair 5 absent — model tables:2 and sit-out 4.
    const s = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
    ];
    const clean = evaluateSwissSeating(
      s,
      4,
      input({ tables: 2, hadBye: new Set([]) }),
    );
    expect(clean.byeRepeat).toBe(false);

    const repeat = evaluateSwissSeating(
      s,
      4,
      input({ tables: 2, hadBye: new Set([4]) }),
    );
    expect(repeat.byeRepeat).toBe(true);
  });

  it("flags a stationary pair moved off its home seat", () => {
    // Pair 1's home is table 1 NS; seat it at table 3 to force a conflict.
    const moved = [
      { tableNumber: 1, ns: 3, ew: 4 },
      { tableNumber: 2, ns: 2, ew: 5 },
      { tableNumber: 3, ns: 1, ew: 6 },
    ];
    const stationary = new Map([[1, swissPairHomeSeat(3, 1)]]);
    const a = evaluateSwissSeating(
      moved,
      null,
      input({ tables: 3, stationary }),
    );
    expect(a.hadStationaryConflict).toBe(true);
    // Pair 1 (stationary, home table 1) was moved to table 3 -> flag table 3.
    expect(a.problemTables).toEqual([3]);
  });
});

describe("chooseHalfMatchGroup", () => {
  it("picks the lowest-ranked three and anchors the best-standing of them", () => {
    // Standings best-first; the bottom three are 7, 8, 9.
    const group = chooseHalfMatchGroup(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      new Set(),
      new Set(),
    );
    // The three are {7,8,9}; anchor is the best-standing (7); halves by standing.
    expect(halfMatchGroupIds(group)).toEqual(new Set([7, 8, 9]));
    expect(group.anchor).toBe(7);
    expect(group.halfOneOpponent).toBe(8);
    expect(group.halfTwoOpponent).toBe(9);
  });

  it("skips pairs that have already had a half-match or a bye", () => {
    // 8 and 9 already had a half-match; 7 already had a bye. So the next three
    // fresh from the bottom are 6, 5, 4.
    const group = chooseHalfMatchGroup(
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      new Set([7]),
      new Set([8, 9]),
    );
    expect(halfMatchGroupIds(group)).toEqual(new Set([4, 5, 6]));
    expect(group.anchor).toBe(4); // best-standing of {4,5,6}
    expect(group.halfOneOpponent).toBe(5);
    expect(group.halfTwoOpponent).toBe(6);
  });

  it("tops up with lowest-ranked pairs when fewer than three are fresh", () => {
    // Everyone except pair 1 has had a half-match; still forms a group of three.
    const standings = [1, 2, 3, 4, 5];
    const group = chooseHalfMatchGroup(
      standings,
      new Set(),
      new Set([2, 3, 4, 5]),
    );
    expect(halfMatchGroupIds(group).size).toBe(3);
    // 1 is the only fresh pair (picked first); the other two topped up from the
    // bottom (5, 4). Ordered by standing: anchor 1, then 4, then 5.
    expect(halfMatchGroupIds(group)).toEqual(new Set([1, 4, 5]));
    expect(group.anchor).toBe(1);
    expect(group.halfOneOpponent).toBe(4);
    expect(group.halfTwoOpponent).toBe(5);
  });

  it("throws for a field smaller than three", () => {
    expect(() => chooseHalfMatchGroup([1, 2], new Set(), new Set())).toThrow(
      /at least three/,
    );
  });
});

describe("reanchorHalfMatchGroup", () => {
  const group: SwissHalfMatchGroup = {
    anchor: 7,
    halfOneOpponent: 8,
    halfTwoOpponent: 9,
  };

  it("returns the group unchanged when the new anchor is already the anchor", () => {
    expect(reanchorHalfMatchGroup(group, 7)).toEqual(group);
  });

  it("re-anchors onto the half-1 opponent, demoting the old anchor into half 1", () => {
    expect(reanchorHalfMatchGroup(group, 8)).toEqual({
      anchor: 8,
      halfOneOpponent: 7,
      halfTwoOpponent: 9,
    });
  });

  it("re-anchors onto the half-2 opponent, demoting the old anchor into half 2", () => {
    expect(reanchorHalfMatchGroup(group, 9)).toEqual({
      anchor: 9,
      halfOneOpponent: 8,
      halfTwoOpponent: 7,
    });
  });

  it("keeps the same three pairs after re-anchoring", () => {
    expect(halfMatchGroupIds(reanchorHalfMatchGroup(group, 9))).toEqual(
      halfMatchGroupIds(group),
    );
  });

  it("throws when the new anchor is not in the group", () => {
    expect(() => reanchorHalfMatchGroup(group, 1)).toThrow(/one of the group/);
  });
});
