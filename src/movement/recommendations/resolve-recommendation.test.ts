import { describe, it, expect } from "vitest";
import {
  resolveRecommendationDescriptor,
  RecommendationEntryInput,
  SpecCatalogEntry,
} from "./resolve-recommendation";

function entry(
  overrides: Partial<RecommendationEntryInput>,
): RecommendationEntryInput {
  return {
    tables: 3,
    boards: 24,
    movement: "Mitchell",
    rounds: 3,
    boardsPerRound: 8,
    pros: ["p"],
    cons: ["c"],
    ...overrides,
  };
}

const catalog: SpecCatalogEntry[] = [
  { id: 1, name: "3 Table Howell", family: "HOWELL", tables: 3, rounds: 5 },
  {
    id: 2,
    name: "6 Table 3/4 Howell",
    family: "HOWELL",
    tables: 6,
    rounds: 9,
  },
  {
    id: 3,
    name: "6 Table Full Howell",
    family: "HOWELL",
    tables: 6,
    rounds: 11,
  },
  {
    id: 4,
    name: "[WEB8R] 13 Table Web Mitchell (8 rounds)",
    family: "WEB",
    tables: 13,
    rounds: 8,
  },
  {
    id: 5,
    name: "13 table Appendix Mitchell",
    family: "APPENDIX",
    tables: 13,
    rounds: 11,
  },
  {
    id: 6,
    name: "Square Mitchell (4 tables)",
    family: "SQUARE",
    tables: 4,
    rounds: 4,
  },
  {
    id: 7,
    name: "Double Weave Mitchell",
    family: "DOUBLE_WEAVE",
    tables: 8,
    rounds: 8,
  },
];

describe("resolveRecommendationDescriptor — SPEC labels", () => {
  it("resolves a Howell to a seeded HOWELL spec, carrying the entry boardsPerRound", () => {
    const result = resolveRecommendationDescriptor(
      entry({ tables: 3, movement: "Howell", rounds: 5, boardsPerRound: 5 }),
      catalog,
    );
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.descriptors).toHaveLength(1);
      expect(result.descriptors[0]).toMatchObject({
        type: "SPEC",
        name: "3 Table Howell",
        rounds: 5,
        boardsPerRound: 5,
        copies: 1,
      });
    }
  });

  it("prefers a 3/4-named spec for a '3/4 Howell' label", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 6,
        movement: "3/4 Howell",
        rounds: 9,
        boardsPerRound: 3,
      }),
      catalog,
    );
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.descriptors[0]).toMatchObject({
        type: "SPEC",
        name: "6 Table 3/4 Howell",
      });
    }
  });

  it("resolves an even-table Web Mitchell to a generated WEB descriptor", () => {
    const web = resolveRecommendationDescriptor(
      entry({
        tables: 14,
        movement: "Web Mitchell",
        rounds: 8,
        boardsPerRound: 3,
      }),
      catalog,
    );
    expect(web.resolved && web.descriptors[0]).toMatchObject({
      type: "MITCHELL",
      subtype: "WEB",
      tables: 14,
      rounds: 8,
      boardsPerRound: 3,
      arrowSwitches: 0,
      // Even-table Web uses two physical board-set copies (A/B).
      copies: 2,
    });
  });

  it("resolves an odd-table Web Mitchell to the seeded WEB spec", () => {
    const web = resolveRecommendationDescriptor(
      entry({
        tables: 13,
        movement: "Web Mitchell",
        rounds: 8,
        boardsPerRound: 3,
      }),
      catalog,
    );
    expect(web.resolved && web.descriptors[0]).toMatchObject({
      type: "SPEC",
      name: "[WEB8R] 13 Table Web Mitchell (8 rounds)",
      rounds: 8,
      // Seeded Web specs are two-board-set movements.
      copies: 2,
    });
  });

  it("resolves Appendix to its family", () => {
    const appendix = resolveRecommendationDescriptor(
      entry({
        tables: 13,
        movement: "Appendix Mitchell",
        rounds: 11,
        boardsPerRound: 2,
      }),
      catalog,
    );
    expect(appendix.resolved && appendix.descriptors[0]).toMatchObject({
      name: "13 table Appendix Mitchell",
    });
  });

  it("resolves a Square Mitchell to the seeded SQUARE spec at any boardsPerRound", () => {
    for (const [boards, bpr] of [
      [20, 5],
      [24, 6],
    ] as const) {
      const result = resolveRecommendationDescriptor(
        entry({
          tables: 4,
          boards,
          movement: "Square Mitchell",
          rounds: 4,
          boardsPerRound: bpr,
        }),
        catalog,
      );
      expect(result.resolved).toBe(true);
      if (result.resolved) {
        expect(result.descriptors[0]).toMatchObject({
          type: "SPEC",
          name: "Square Mitchell (4 tables)",
          boardsPerRound: bpr,
        });
      }
    }
  });

  it("resolves a Double Weave Mitchell to the seeded DOUBLE_WEAVE spec", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 8,
        boards: 24,
        movement: "Double Weave Mitchell",
        rounds: 8,
        boardsPerRound: 3,
      }),
      catalog,
    );
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.descriptors[0]).toMatchObject({
        type: "SPEC",
        name: "Double Weave Mitchell",
      });
    }
  });

  it("reports a gap when no seeded spec matches tables+rounds", () => {
    const result = resolveRecommendationDescriptor(
      entry({ tables: 3, movement: "Howell", rounds: 99, boardsPerRound: 2 }),
      catalog,
    );
    expect(result.resolved).toBe(false);
  });
});

describe("resolveRecommendationDescriptor — Mitchell family", () => {
  it("odd tables -> STANDARD", () => {
    const result = resolveRecommendationDescriptor(
      entry({ tables: 5, movement: "Mitchell", rounds: 5, boardsPerRound: 5 }),
      catalog,
    );
    expect(result.resolved && result.descriptors[0]).toMatchObject({
      type: "MITCHELL",
      subtype: "STANDARD",
      arrowSwitches: 0,
      // Non-Web Mitchell plays a single board-set copy.
      copies: 1,
    });
  });

  it("even tables, rounds == tables -> SHARE_AND_RELAY", () => {
    const result = resolveRecommendationDescriptor(
      entry({ tables: 6, movement: "Mitchell", rounds: 6, boardsPerRound: 4 }),
      catalog,
    );
    expect(result.resolved && result.descriptors[0]).toMatchObject({
      subtype: "SHARE_AND_RELAY",
    });
  });

  it("even tables, rounds < tables -> SKIP", () => {
    const result = resolveRecommendationDescriptor(
      entry({ tables: 6, movement: "Mitchell", rounds: 5, boardsPerRound: 4 }),
      catalog,
    );
    expect(result.resolved && result.descriptors[0]).toMatchObject({
      subtype: "SKIP",
    });
  });

  it("Relay Mitchell -> SHARE_AND_RELAY", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 6,
        movement: "Relay Mitchell",
        rounds: 6,
        boardsPerRound: 4,
      }),
      catalog,
    );
    expect(result.resolved && result.descriptors[0]).toMatchObject({
      subtype: "SHARE_AND_RELAY",
    });
  });

  it("Skip Mitchell -> SKIP", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 6,
        movement: "Skip Mitchell",
        rounds: 5,
        boardsPerRound: 4,
      }),
      catalog,
    );
    expect(result.resolved && result.descriptors[0]).toMatchObject({
      subtype: "SKIP",
    });
  });

  it("Hesitation Mitchell -> HESITATION", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 5,
        movement: "Hesitation Mitchell",
        rounds: 6,
        boardsPerRound: 3,
      }),
      catalog,
    );
    expect(result.resolved && result.descriptors[0]).toMatchObject({
      subtype: "HESITATION",
    });
  });

  it("Arrow Switch Mitchell odd tables -> one STANDARD with arrowSwitches", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 7,
        movement: "Arrow Switch Mitchell",
        rounds: 7,
        boardsPerRound: 3,
      }),
      catalog,
    );
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.descriptors).toHaveLength(1);
      expect(result.descriptors[0]).toMatchObject({
        subtype: "STANDARD",
        arrowSwitches: 1,
      });
    }
  });

  it("Arrow Switch Mitchell even tables -> two descriptors (share-and-relay + skip)", () => {
    const result = resolveRecommendationDescriptor(
      entry({
        tables: 8,
        movement: "Arrow Switch Mitchell",
        rounds: 7,
        boardsPerRound: 4,
      }),
      catalog,
    );
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.descriptors.map((d) => d.type === "MITCHELL" && d.subtype)).toEqual([
        "SHARE_AND_RELAY",
        "SKIP",
      ]);
      expect(
        result.descriptors.every(
          (d) => d.type === "MITCHELL" && d.arrowSwitches === 1,
        ),
      ).toBe(true);
    }
  });
});

describe("resolveRecommendationDescriptor — excluded (out of scope) labels", () => {
  for (const movement of [
    "Twin Mitchell",
    "Twin Skip Mitchell",
    "Beynon Mitchell",
    "Hybrid",
  ]) {
    it(`marks ${movement} as excluded`, () => {
      const result = resolveRecommendationDescriptor(
        entry({ movement }),
        catalog,
      );
      expect(result.resolved).toBe(false);
      if (!result.resolved) {
        expect(result.excluded).toBe(true);
      }
    });
  }
});
