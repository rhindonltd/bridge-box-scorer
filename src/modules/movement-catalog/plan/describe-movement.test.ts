import { describe, it, expect } from "vitest";
import {
  describeGeneratedMovement,
  describeStoredMovement,
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

describe("describeGeneratedMovement — Teams Round Robin", () => {
  it("lays out round 1 positionally, every table filled NS + EW", () => {
    const result = describeGeneratedMovement({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: 2, rounds: 1, boardsPerRound: 4 },
    });
    expect(result.missingPair).toBeNull();
    expect(result.layout).toEqual(
      [1, 2].map((tableNumber) => ({
        tableNumber,
        rounds: [
          {
            roundNumber: 1,
            ns: `${tableNumber}NS`,
            ew: `${tableNumber}EW`,
            boardStart: 1,
            boardEnd: 4,
            boardCopy: "A",
          },
        ],
      })),
    );
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
