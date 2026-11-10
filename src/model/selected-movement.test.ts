import { describe, it, expect } from "vitest";
import {
  SelectedMovement,
  parseSelectedMovement,
  serializeSelectedMovement,
  selectedMovementsEqual,
  stationaryPairsForRound,
  withStationaryHistory,
} from "./selected-movement";
import type { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

describe("SelectedMovement round-trip", () => {
  it("round-trips a SPEC selection", () => {
    const selected: SelectedMovement = {
      source: "SPEC",
      specId: 42,
      boardsPerRound: 3,
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a MITCHELL selection", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: {
        tables: 5,
        rounds: 5,
        boardsPerRound: 3,
        arrowSwitchRounds: 1,
        skip: false,
      },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a WEB Mitchell selection", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: {
        tables: 14,
        rounds: 8,
        boardsPerRound: 3,
        web: true,
      },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips an American Whist Mitchell selection", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: {
        tables: 5,
        rounds: 5,
        boardsPerRound: 5,
        americanWhist: true,
      },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a SWISS selection", () => {
    const selected: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 6, rounds: 8, boardsPerRound: 3 },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a SWISS selection with a HALF_MATCHES odd-round plan", () => {
    const selected: SelectedMovement = {
      source: "SWISS",
      swiss: {
        tables: 5,
        rounds: 3,
        boardsPerRound: 6,
        oddHandling: "HALF_MATCHES",
        oddRoundPlan: ["BYE", "HALF_MATCHES", "HALF_MATCHES"],
      },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a SWISS selection with explicit BYE odd handling (no plan)", () => {
    const selected: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 5, rounds: 4, boardsPerRound: 6, oddHandling: "BYE" },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a SWISS_TEAMS selection", () => {
    const selected: SelectedMovement = {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 8, rounds: 7, boardsPerRound: 4 },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a SWISS_TEAMS selection with oddHandling", () => {
    const selected: SelectedMovement = {
      source: "SWISS_TEAMS",
      swissTeams: {
        teams: 5,
        rounds: 7,
        boardsPerRound: 4,
        oddHandling: "BYE",
      },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });

  it("round-trips a ROUND_ROBIN_TEAMS selection", () => {
    const selected: SelectedMovement = {
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: 6, rounds: 5, boardsPerRound: 4 },
    };

    const parsed = parseSelectedMovement(serializeSelectedMovement(selected));

    expect(parsed).toEqual(selected);
  });
});

describe("parseSelectedMovement", () => {
  it("returns null for null / undefined / empty", () => {
    expect(parseSelectedMovement(null)).toBeNull();
    expect(parseSelectedMovement(undefined)).toBeNull();
    expect(parseSelectedMovement("")).toBeNull();
  });

  it("returns null for non-JSON text", () => {
    expect(parseSelectedMovement("not json")).toBeNull();
  });

  it("returns null for JSON that does not match the schema", () => {
    expect(
      parseSelectedMovement(JSON.stringify({ source: "OTHER" })),
    ).toBeNull();
    expect(
      parseSelectedMovement(JSON.stringify({ source: "SPEC" })),
    ).toBeNull();
    expect(
      parseSelectedMovement(
        JSON.stringify({ source: "MITCHELL", mitchell: { tables: 5 } }),
      ),
    ).toBeNull();
  });

  it("rejects a non-positive spec id", () => {
    expect(
      parseSelectedMovement(
        JSON.stringify({ source: "SPEC", specId: 0, boardsPerRound: 3 }),
      ),
    ).toBeNull();
  });

  it("rejects a SPEC selection without boards per round", () => {
    expect(
      parseSelectedMovement(JSON.stringify({ source: "SPEC", specId: 1 })),
    ).toBeNull();
  });

  it("rejects a SWISS HALF_MATCHES selection whose plan length != rounds", () => {
    expect(
      parseSelectedMovement(
        JSON.stringify({
          source: "SWISS",
          swiss: {
            tables: 5,
            rounds: 3,
            boardsPerRound: 6,
            oddHandling: "HALF_MATCHES",
            oddRoundPlan: ["BYE", "HALF_MATCHES"], // only 2 for 3 rounds
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects a SWISS HALF_MATCHES selection with no plan at all", () => {
    expect(
      parseSelectedMovement(
        JSON.stringify({
          source: "SWISS",
          swiss: {
            tables: 5,
            rounds: 3,
            boardsPerRound: 6,
            oddHandling: "HALF_MATCHES",
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects a SWISS oddRoundPlan when oddHandling is not HALF_MATCHES", () => {
    expect(
      parseSelectedMovement(
        JSON.stringify({
          source: "SWISS",
          swiss: {
            tables: 5,
            rounds: 2,
            boardsPerRound: 6,
            oddHandling: "BYE",
            oddRoundPlan: ["BYE", "BYE"],
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects an invalid oddRoundPlan entry", () => {
    expect(
      parseSelectedMovement(
        JSON.stringify({
          source: "SWISS",
          swiss: {
            tables: 5,
            rounds: 2,
            boardsPerRound: 6,
            oddHandling: "HALF_MATCHES",
            oddRoundPlan: ["BYE", "SHORT"], // SHORT is a teams-only value
          },
        }),
      ),
    ).toBeNull();
  });

  // --- Swiss Teams TRIPLE oddRoundPlan ---------------------------------------

  const parseTeams = (swissTeams: unknown) =>
    parseSelectedMovement(
      JSON.stringify({ source: "SWISS_TEAMS", swissTeams }),
    );

  it("accepts a SWISS_TEAMS TRIPLE plan with byes, shorts and a long group", () => {
    const parsed = parseTeams({
      teams: 5,
      rounds: 5,
      boardsPerRound: 6,
      oddHandling: "TRIPLE",
      oddRoundPlan: [
        "BYE",
        "SHORT",
        { kind: "LONG", group: 1 },
        { kind: "LONG", group: 1 },
        "SHORT",
      ],
    });
    expect(parsed).not.toBeNull();
  });

  it("accepts two back-to-back long triples with distinct groups", () => {
    const parsed = parseTeams({
      teams: 7,
      rounds: 4,
      boardsPerRound: 6,
      oddHandling: "TRIPLE",
      oddRoundPlan: [
        { kind: "LONG", group: 1 },
        { kind: "LONG", group: 1 },
        { kind: "LONG", group: 2 },
        { kind: "LONG", group: 2 },
      ],
    });
    expect(parsed).not.toBeNull();
  });

  it("rejects a TRIPLE plan whose length does not match rounds", () => {
    expect(
      parseTeams({
        teams: 5,
        rounds: 3,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: ["BYE", "SHORT"],
      }),
    ).toBeNull();
  });

  it("rejects a TRIPLE selection with no plan", () => {
    expect(
      parseTeams({
        teams: 5,
        rounds: 2,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
      }),
    ).toBeNull();
  });

  it("rejects an oddRoundPlan when oddHandling is not TRIPLE", () => {
    expect(
      parseTeams({
        teams: 5,
        rounds: 2,
        boardsPerRound: 6,
        oddHandling: "BYE",
        oddRoundPlan: ["BYE", "BYE"],
      }),
    ).toBeNull();
  });

  it("rejects a LONG group that is not two adjacent rounds", () => {
    // group 1's two entries are at positions 0 and 2 (not adjacent).
    expect(
      parseTeams({
        teams: 5,
        rounds: 3,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [
          { kind: "LONG", group: 1 },
          "SHORT",
          { kind: "LONG", group: 1 },
        ],
      }),
    ).toBeNull();
  });

  it("rejects a LONG group that appears only once", () => {
    expect(
      parseTeams({
        teams: 5,
        rounds: 2,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [{ kind: "LONG", group: 1 }, "BYE"],
      }),
    ).toBeNull();
  });

  it("rejects a LONG group appearing more than twice", () => {
    expect(
      parseTeams({
        teams: 5,
        rounds: 3,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [
          { kind: "LONG", group: 1 },
          { kind: "LONG", group: 1 },
          { kind: "LONG", group: 1 },
        ],
      }),
    ).toBeNull();
  });
});

describe("selectedMovementsEqual", () => {
  const spec = (specId: number, boardsPerRound = 3): SelectedMovement => ({
    source: "SPEC",
    specId,
    boardsPerRound,
  });
  const mitchell = (
    over: Partial<MitchellMovementSpec> = {},
  ): SelectedMovement => ({
    source: "MITCHELL",
    mitchell: { tables: 6, rounds: 6, boardsPerRound: 3, ...over },
  });

  it("treats two nulls as equal and null vs a movement as different", () => {
    expect(selectedMovementsEqual(null, null)).toBe(true);
    expect(selectedMovementsEqual(null, spec(1))).toBe(false);
    expect(selectedMovementsEqual(spec(1), null)).toBe(false);
  });

  it("compares SPEC selections by id and boards per round", () => {
    expect(selectedMovementsEqual(spec(1), spec(1))).toBe(true);
    expect(selectedMovementsEqual(spec(1), spec(2))).toBe(false);
    expect(selectedMovementsEqual(spec(1, 3), spec(1, 4))).toBe(false);
  });

  it("treats different sources as different", () => {
    expect(selectedMovementsEqual(spec(1), mitchell())).toBe(false);
  });

  it("compares MITCHELL specs by their defining fields", () => {
    expect(selectedMovementsEqual(mitchell(), mitchell())).toBe(true);
    expect(selectedMovementsEqual(mitchell(), mitchell({ rounds: 7 }))).toBe(
      false,
    );
    // Absent flag equals explicit false.
    expect(selectedMovementsEqual(mitchell(), mitchell({ skip: false }))).toBe(
      true,
    );
    expect(selectedMovementsEqual(mitchell(), mitchell({ skip: true }))).toBe(
      false,
    );
    // The americanWhist flag participates in equality: two AWL selections are
    // equal, and an AWL differs from a plain Standard with the same fields.
    expect(
      selectedMovementsEqual(
        mitchell({ americanWhist: true }),
        mitchell({ americanWhist: true }),
      ),
    ).toBe(true);
    expect(
      selectedMovementsEqual(mitchell(), mitchell({ americanWhist: true })),
    ).toBe(false);
  });

  const swiss = (
    over: Partial<{
      tables: number;
      rounds: number;
      boardsPerRound: number;
      oddHandling: "BYE" | "HALF_MATCHES";
      oddRoundPlan: ("BYE" | "HALF_MATCHES")[];
      stationaryPairs: number[];
      stationaryEarlier: { throughRound: number; pairs: number[] }[];
    }> = {},
  ): SelectedMovement => ({
    source: "SWISS",
    swiss: { tables: 6, rounds: 8, boardsPerRound: 3, ...over },
  });

  it("compares SWISS selections by their defining fields", () => {
    expect(selectedMovementsEqual(swiss(), swiss())).toBe(true);
    expect(selectedMovementsEqual(swiss(), swiss({ rounds: 9 }))).toBe(false);
    expect(selectedMovementsEqual(swiss(), swiss({ tables: 7 }))).toBe(false);
    expect(selectedMovementsEqual(swiss(), swiss({ boardsPerRound: 2 }))).toBe(
      false,
    );
  });

  it("compares SWISS odd handling and the per-round plan, but not stationary pairs", () => {
    // Absent oddHandling equals an explicit "BYE".
    expect(selectedMovementsEqual(swiss(), swiss({ oddHandling: "BYE" }))).toBe(
      true,
    );
    // HALF_MATCHES needs a matching plan length (2 rounds here).
    const plan = (over = {}) =>
      swiss({
        rounds: 2,
        oddHandling: "HALF_MATCHES",
        oddRoundPlan: ["BYE", "HALF_MATCHES"],
        ...over,
      });
    expect(selectedMovementsEqual(plan(), plan())).toBe(true);
    expect(
      selectedMovementsEqual(
        plan(),
        plan({ oddRoundPlan: ["HALF_MATCHES", "BYE"] }),
      ),
    ).toBe(false);
    expect(selectedMovementsEqual(swiss(), plan())).toBe(false);
    // Stationary pairs are NOT part of equality: marking a pair stationary
    // (even mid-event) leaves the round structure alone, so it must not count
    // as a new movement (which would clear a running timer).
    expect(
      selectedMovementsEqual(
        swiss({ stationaryPairs: [1] }),
        swiss({ stationaryPairs: [2] }),
      ),
    ).toBe(true);
    expect(
      selectedMovementsEqual(
        swiss(),
        swiss({
          stationaryPairs: [1],
          stationaryEarlier: [{ throughRound: 2, pairs: [] }],
        }),
      ),
    ).toBe(true);
  });
  it("treats SWISS as different from other sources", () => {
    expect(selectedMovementsEqual(swiss(), mitchell())).toBe(false);
    expect(selectedMovementsEqual(swiss(), spec(1))).toBe(false);
  });

  const swissTeams = (
    over: Partial<{
      teams: number;
      rounds: number;
      boardsPerRound: number;
      oddHandling: "BYE" | "TRIPLE";
    }> = {},
  ): SelectedMovement => ({
    source: "SWISS_TEAMS",
    swissTeams: { teams: 8, rounds: 7, boardsPerRound: 4, ...over },
  });

  it("compares SWISS_TEAMS selections by their defining fields", () => {
    expect(selectedMovementsEqual(swissTeams(), swissTeams())).toBe(true);
    expect(
      selectedMovementsEqual(swissTeams(), swissTeams({ rounds: 8 })),
    ).toBe(false);
    expect(selectedMovementsEqual(swissTeams(), swissTeams({ teams: 6 }))).toBe(
      false,
    );
    expect(
      selectedMovementsEqual(swissTeams(), swissTeams({ boardsPerRound: 3 })),
    ).toBe(false);
    // oddHandling participates in equality; absent means the default "BYE".
    expect(
      selectedMovementsEqual(swissTeams(), swissTeams({ oddHandling: "BYE" })),
    ).toBe(true);
    expect(
      selectedMovementsEqual(
        swissTeams(),
        swissTeams({ oddHandling: "TRIPLE" }),
      ),
    ).toBe(false);
  });

  it("treats SWISS_TEAMS as different from other sources", () => {
    expect(selectedMovementsEqual(swissTeams(), swiss())).toBe(false);
    expect(selectedMovementsEqual(swissTeams(), mitchell())).toBe(false);
  });

  const roundRobinTeams = (
    over: Partial<{
      teams: number;
      rounds: number;
      boardsPerRound: number;
    }> = {},
  ): SelectedMovement => ({
    source: "ROUND_ROBIN_TEAMS",
    roundRobinTeams: { teams: 6, rounds: 5, boardsPerRound: 4, ...over },
  });

  it("compares ROUND_ROBIN_TEAMS selections by their defining fields", () => {
    expect(selectedMovementsEqual(roundRobinTeams(), roundRobinTeams())).toBe(
      true,
    );
    expect(
      selectedMovementsEqual(roundRobinTeams(), roundRobinTeams({ rounds: 4 })),
    ).toBe(false);
    expect(
      selectedMovementsEqual(roundRobinTeams(), roundRobinTeams({ teams: 8 })),
    ).toBe(false);
    expect(
      selectedMovementsEqual(
        roundRobinTeams(),
        roundRobinTeams({ boardsPerRound: 3 }),
      ),
    ).toBe(false);
  });

  it("treats ROUND_ROBIN_TEAMS as different from other sources", () => {
    expect(selectedMovementsEqual(roundRobinTeams(), swissTeams())).toBe(false);
    expect(selectedMovementsEqual(roundRobinTeams(), mitchell())).toBe(false);
  });
});

describe("stationary pairs over the event", () => {
  const swissOf = (swiss: Record<string, unknown> = {}): SelectedMovement => ({
    source: "SWISS",
    swiss: { tables: 5, rounds: 7, boardsPerRound: 3, ...swiss },
  });
  const spec = (m: SelectedMovement) =>
    (m as Extract<SelectedMovement, { source: "SWISS" }>).swiss;

  describe("stationaryPairsForRound", () => {
    it("uses the current list when nothing was recorded", () => {
      expect(stationaryPairsForRound({ stationaryPairs: [3] }, 4)).toEqual([3]);
      expect(stationaryPairsForRound({}, 2)).toEqual([]);
    });

    it("gives a drawn round the list it was drawn under", () => {
      const s = {
        stationaryPairs: [3, 7],
        stationaryEarlier: [
          { throughRound: 2, pairs: [3] },
          { throughRound: 4, pairs: [3, 6] },
        ],
      };
      expect(stationaryPairsForRound(s, 1)).toEqual([3]);
      expect(stationaryPairsForRound(s, 2)).toEqual([3]);
      expect(stationaryPairsForRound(s, 3)).toEqual([3, 6]);
      expect(stationaryPairsForRound(s, 4)).toEqual([3, 6]);
      // Rounds not yet drawn use the current list.
      expect(stationaryPairsForRound(s, 5)).toEqual([3, 7]);
    });
  });

  describe("withStationaryHistory", () => {
    it("records nothing for a change made before any round is drawn", () => {
      const next = withStationaryHistory(
        swissOf(),
        swissOf({ stationaryPairs: [2] }),
        0,
      );
      expect(spec(next).stationaryPairs).toEqual([2]);
      expect(spec(next).stationaryEarlier).toBeUndefined();
    });

    it("records the old list through the last drawn round when it changes", () => {
      const next = withStationaryHistory(
        swissOf({ stationaryPairs: [2] }),
        swissOf({ stationaryPairs: [2, 4] }),
        3,
      );
      expect(spec(next).stationaryEarlier).toEqual([
        { throughRound: 3, pairs: [2] },
      ]);
      expect(stationaryPairsForRound(spec(next), 3)).toEqual([2]);
      expect(stationaryPairsForRound(spec(next), 4)).toEqual([2, 4]);
    });

    it("records marking a first pair, and unmarking the last one", () => {
      const marked = withStationaryHistory(
        swissOf(),
        swissOf({ stationaryPairs: [1] }),
        2,
      );
      expect(stationaryPairsForRound(spec(marked), 2)).toEqual([]);
      const unmarked = withStationaryHistory(
        marked,
        swissOf({
          stationaryPairs: [],
          stationaryEarlier: spec(marked).stationaryEarlier,
        }),
        4,
      );
      expect(stationaryPairsForRound(spec(unmarked), 2)).toEqual([]);
      expect(stationaryPairsForRound(spec(unmarked), 4)).toEqual([1]);
      expect(stationaryPairsForRound(spec(unmarked), 5)).toEqual([]);
    });

    it("keeps the FIRST recorded list when changed twice before the next draw", () => {
      const once = withStationaryHistory(
        swissOf({ stationaryPairs: [2] }),
        swissOf({ stationaryPairs: [2, 4] }),
        3,
      );
      const twice = withStationaryHistory(
        once,
        swissOf({ stationaryPairs: [4] }),
        3,
      );
      expect(spec(twice).stationaryEarlier).toEqual([
        { throughRound: 3, pairs: [2] },
      ]);
      expect(spec(twice).stationaryPairs).toEqual([4]);
    });

    it("does not add an entry when the list is unchanged", () => {
      const next = withStationaryHistory(
        swissOf({ stationaryPairs: [2] }),
        swissOf({ stationaryPairs: [2], rounds: 7 }),
        3,
      );
      expect(spec(next).stationaryEarlier).toBeUndefined();
    });

    it("carries the history forward and ignores whatever the client sends", () => {
      const previous = withStationaryHistory(
        swissOf({ stationaryPairs: [2] }),
        swissOf({ stationaryPairs: [5] }),
        2,
      );
      const next = withStationaryHistory(
        previous,
        swissOf({
          stationaryPairs: [5],
          stationaryEarlier: [{ throughRound: 9, pairs: [1, 2, 3] }],
        }),
        2,
      );
      expect(spec(next).stationaryEarlier).toEqual([
        { throughRound: 2, pairs: [2] },
      ]);
    });

    it("leaves other movement sources untouched", () => {
      const other: SelectedMovement = {
        source: "SPEC",
        specId: 1,
        boardsPerRound: 3,
      };
      expect(withStationaryHistory(null, other, 0)).toBe(other);
    });
  });
});
