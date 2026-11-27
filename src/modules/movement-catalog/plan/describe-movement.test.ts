import { describe, it, expect } from "vitest";
import {
  describeGeneratedMovement,
  describeStoredMovement,
  describeStoredTeamsMovement,
  type FixedSelectedMovement,
} from "./describe-movement";

type MitchellSpec = Extract<
  FixedSelectedMovement,
  { source: "MITCHELL" }
>["mitchell"];

/**
 * A Mitchell is pure generation: its layout comes from the spec.
 */
describe("describeGeneratedMovement — Mitchell variants", () => {
  function mitchell(
    spec: MitchellSpec,
  ): Extract<FixedSelectedMovement, { source: "MITCHELL" }> {
    return { source: "MITCHELL", mitchell: spec };
  }

  it("regenerates a Standard Mitchell", () => {
    const result = describeGeneratedMovement(
      mitchell({ tables: 5, rounds: 5, boardsPerRound: 4 }),
    );

    expect(result.layout).toHaveLength(5);
    // Standard Mitchell: rounds === spec.rounds.
    expect(result.layout[0].rounds).toHaveLength(5);
  });

  it("rejects an even-table Standard Mitchell selection with a clear message", () => {
    // A corrupt/hand-crafted MITCHELL selection with an even table count and no
    // variant flag must fail fast at start rather than produce a
    // broken movement. The generator's guard propagates unwrapped.
    expect(() =>
      describeGeneratedMovement(
        mitchell({ tables: 4, rounds: 4, boardsPerRound: 2 }),
      ),
    ).toThrow("Standard Mitchell requires an odd number of tables");
  });

  it("builds an American Whist Mitchell", () => {
    const result = describeGeneratedMovement(
      mitchell({
        tables: 5,
        rounds: 5,
        boardsPerRound: 5,
        americanWhist: true,
      }),
    );

    expect(result.layout).toHaveLength(5);
    expect(result.layout[0].rounds).toHaveLength(5);
    // AWL round 2 at table 1: EW pair moved down two tables (pair 3), boards
    // moved down one (set 2 => boards 6-10).
    expect(result.layout[0].rounds[1]).toMatchObject({
      ew: "3EW",
      boardStart: 6,
      boardEnd: 10,
    });
  });

  it("builds a Skip Mitchell (fewer rounds than tables)", () => {
    const result = describeGeneratedMovement(
      mitchell({ tables: 6, rounds: 5, boardsPerRound: 4, skip: true }),
    );

    expect(result.layout).toHaveLength(6);
    expect(result.layout[0].rounds).toHaveLength(5);
  });

  it("builds a Share and Relay Mitchell (rounds === tables)", () => {
    const result = describeGeneratedMovement(
      mitchell({
        tables: 6,
        rounds: 6,
        boardsPerRound: 4,
        shareAndRelay: true,
      }),
    );

    expect(result.layout).toHaveLength(6);
    expect(result.layout[0].rounds).toHaveLength(6);
  });

  it("builds a Hesitation Mitchell (tables + 1 rounds)", () => {
    const result = describeGeneratedMovement(
      mitchell({ tables: 5, rounds: 6, boardsPerRound: 3, hesitation: true }),
    );

    expect(result.layout).toHaveLength(5);
    // Hesitation Mitchell always produces tables + 1 rounds.
    expect(result.layout[0].rounds).toHaveLength(6);
  });

  it("builds a Web Mitchell, with board copies populated", () => {
    const result = describeGeneratedMovement(
      mitchell({ tables: 14, rounds: 8, boardsPerRound: 3, web: true }),
    );

    expect(result.layout).toHaveLength(14);
    expect(result.layout[0].rounds).toHaveLength(8);

    // First half plays copy A, second half copy B.
    const firstHalf = result.layout.find((t) => t.tableNumber === 1);
    const secondHalf = result.layout.find((t) => t.tableNumber === 14);
    expect(firstHalf?.rounds.every((r) => r.boardCopy === "A")).toBe(true);
    expect(secondHalf?.rounds.every((r) => r.boardCopy === "B")).toBe(true);
  });
});

describe("describeGeneratedMovement — American Whist teams", () => {
  it("lays out the whole schedule, every table filled every round", () => {
    const result = describeGeneratedMovement({
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams: { teams: 3, boardsPerRound: 4 },
    });
    expect(result.missingPair).toBeNull();
    // Round k at table t: team t at home to team t + 2k, on board set t + k − 1.
    expect(
      result.layout.map((t) =>
        t.rounds.map((r) => [r.roundNumber, r.ns, r.ew, r.boardStart]),
      ),
    ).toEqual([
      [
        [1, "1NS", "3EW", 1],
        [2, "1NS", "2EW", 5],
      ],
      [
        [1, "2NS", "1EW", 5],
        [2, "2NS", "3EW", 9],
      ],
      [
        [1, "3NS", "2EW", 9],
        [2, "3NS", "1EW", 1],
      ],
    ]);
  });
});

describe("describeGeneratedMovement — Circulation teams", () => {
  it("lays out three matches, each table starting on its own boards", () => {
    const result = describeGeneratedMovement({
      source: "CIRCULATION_TEAMS",
      circulationTeams: { boardsPerRound: 8 },
    });
    expect(result.missingPair).toBeNull();
    expect(result.layout[1].rounds[0]).toEqual({
      roundNumber: 1,
      ns: "2NS",
      ew: "1EW",
      boardStart: 1,
      boardEnd: 8,
      firstBoard: 3,
      boardCopy: "A",
    });
    // Table 1 starts on the lowest board, so it plays in board order.
    expect(result.layout[0].rounds[2]).toEqual({
      roundNumber: 3,
      ns: "1NS",
      ew: "4EW",
      boardStart: 17,
      boardEnd: 24,
      boardCopy: "A",
    });
  });
});

describe("describeGeneratedMovement — Thurner teams", () => {
  it("lays out the whole schedule, the satellite sharing a table's boards", () => {
    const result = describeGeneratedMovement({
      source: "THURNER_TEAMS",
      thurnerTeams: { teams: 6, boardsPerRound: 2 },
    });
    expect(result.missingPair).toBeNull();
    expect(result.layout).toHaveLength(6);
    // Round 1: team 6's away pair visits table 1, whose boards the satellite
    // (table 6) shares, against team 1's away pair.
    expect(result.layout[0].rounds[0]).toEqual({
      roundNumber: 1,
      ns: "1NS",
      ew: "6EW",
      boardStart: 1,
      boardEnd: 2,
      sharesWith: 6,
      boardCopy: "A",
    });
    expect(result.layout[5].rounds[0]).toMatchObject({
      ns: "6NS",
      ew: "1EW",
      boardStart: 1,
      sharesWith: 1,
    });
    expect(result.layout[1].rounds[0].sharesWith).toBeUndefined();
  });
});

describe("describeGeneratedMovement — Stagger teams", () => {
  it("lays out the whole schedule, each table sharing with its partner", () => {
    const result = describeGeneratedMovement({
      source: "STAGGER_TEAMS",
      staggerTeams: { teams: 6, boardsPerRound: 2 },
    });
    expect(result.missingPair).toBeNull();
    expect(result.layout[0].rounds[0]).toEqual({
      roundNumber: 1,
      ns: "1NS",
      ew: "3EW",
      boardStart: 1,
      boardEnd: 2,
      sharesWith: 4,
      boardCopy: "A",
    });
  });
});

describe("describeGeneratedMovement — head-to-head teams", () => {
  it("lays out both stanzas, table 2 starting on the second half", () => {
    const result = describeGeneratedMovement({
      source: "HEAD_TO_HEAD_TEAMS",
      headToHeadTeams: { boardsPerRound: 12 },
    });
    expect(result.missingPair).toBeNull();
    expect(result.layout[1].rounds).toEqual([
      {
        roundNumber: 1,
        ns: "2NS",
        ew: "1EW",
        boardStart: 1,
        boardEnd: 12,
        firstBoard: 7,
        boardCopy: "A",
      },
      {
        roundNumber: 2,
        ns: "2EW",
        ew: "1EW",
        boardStart: 13,
        boardEnd: 24,
        firstBoard: 19,
        boardCopy: "A",
      },
    ]);
  });
});

describe("describeStoredMovement", () => {
  const selected = { source: "SPEC", specId: 42, boardsPerRound: 2 } as const;
  const rows = [
    {
      tableNumber: 1,
      rounds: [
        { roundNumber: 1, ns: "1", ew: "2", boardSet: 1 },
        { roundNumber: 2, ns: "1", ew: "3", boardSet: 2 },
      ],
    },
  ];

  it("expands board sets into concrete ranges and keeps a positive missing pair", () => {
    const result = describeStoredMovement(selected, rows, 3);
    expect(result.selected).toBe(selected);
    expect(result.missingPair).toBe(3);
    expect(result.layout[0].rounds).toEqual([
      {
        roundNumber: 1,
        ns: "1",
        ew: "2",
        boardStart: 1,
        boardEnd: 2,
        boardCopy: "A",
      },
      {
        roundNumber: 2,
        ns: "1",
        ew: "3",
        boardStart: 3,
        boardEnd: 4,
        boardCopy: "A",
      },
    ]);
  });

  it("treats a missing pair of 0 as none", () => {
    expect(describeStoredMovement(selected, rows, 0).missingPair).toBeNull();
  });

  it("treats an absent missing pair as none", () => {
    expect(describeStoredMovement(selected, rows, null).missingPair).toBeNull();
    expect(
      describeStoredMovement(selected, rows, undefined).missingPair,
    ).toBeNull();
  });
});

describe("describeStoredTeamsMovement", () => {
  const selected = {
    source: "TEAMS_SPEC" as const,
    specId: 7,
    boardsPerRound: 3,
  };
  const tables = [
    {
      tableNumber: 1,
      rounds: [{ roundNumber: 1, ns: "1", ew: "2", boardSet: 2 }],
    },
    {
      tableNumber: 2,
      rounds: [{ roundNumber: 1, ns: "2", ew: "1", boardSet: 2 }],
    },
  ];

  it("seats each home pair NS and the visiting away pair EW", () => {
    expect(describeStoredTeamsMovement(selected, tables)).toEqual({
      selected,
      layout: [
        {
          tableNumber: 1,
          rounds: [
            {
              roundNumber: 1,
              ns: "1NS",
              ew: "2EW",
              boardStart: 4,
              boardEnd: 6,
              boardCopy: "A",
            },
          ],
        },
        {
          tableNumber: 2,
          rounds: [
            {
              roundNumber: 1,
              ns: "2NS",
              ew: "1EW",
              boardStart: 4,
              boardEnd: 6,
              boardCopy: "A",
            },
          ],
        },
      ],
      missingPair: null,
    });
  });

  it("refuses a movement the app cannot run", () => {
    expect(() => describeStoredTeamsMovement(selected, [tables[0]])).toThrow(
      /not a supported teams movement/,
    );
  });
});
