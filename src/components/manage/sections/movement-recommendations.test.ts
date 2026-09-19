import { describe, it, expect } from "vitest";
import {
  movementMatchesSelection,
  groupByBoardsPerPair,
} from "./movement-recommendations";
import type { RecommendedMovement } from "@/movement/recommendations/recommendation-types";

const genSpecRef = (
  spec: Partial<{
    tables: number;
    rounds: number;
    boardsPerRound: number;
    arrowSwitchRounds?: number;
    skip?: boolean;
    shareAndRelay?: boolean;
    hesitation?: boolean;
    web?: boolean;
  }> = {},
) =>
  ({
    source: "generated" as const,
    spec: {
      tables: 6,
      rounds: 6,
      boardsPerRound: 3,
      ...spec,
    },
  }) as any;

describe("movementMatchesSelection", () => {
  it("returns false when there is no selection", () => {
    expect(movementMatchesSelection(genSpecRef(), null)).toBe(false);
  });

  it("matches a seeded (SPEC) selection by numeric id", () => {
    const specRef = { source: "db" as const, id: 7, type: "0" } as any;
    expect(
      movementMatchesSelection(specRef, {
        source: "SPEC",
        specId: 7,
        boardsPerRound: 3,
      }),
    ).toBe(true);
  });

  it("does not match a SPEC selection with a different id", () => {
    const specRef = { source: "db" as const, id: 7, type: "0" } as any;
    expect(
      movementMatchesSelection(specRef, {
        source: "SPEC",
        specId: 8,
        boardsPerRound: 3,
      }),
    ).toBe(false);
  });

  it("does not match a SPEC selection against a generated spec ref", () => {
    expect(
      movementMatchesSelection(genSpecRef(), {
        source: "SPEC",
        specId: 7,
        boardsPerRound: 3,
      }),
    ).toBe(false);
  });

  it("returns false for a non-Mitchell, non-SPEC selection (e.g. SWISS)", () => {
    expect(
      movementMatchesSelection(genSpecRef(), {
        source: "SWISS",
        swiss: { tables: 6, rounds: 6, boardsPerRound: 3 },
      }),
    ).toBe(false);
  });

  it("does not match a MITCHELL selection when the spec ref is a db ref", () => {
    const specRef = { source: "db" as const, id: 7, type: "0" } as any;
    expect(
      movementMatchesSelection(specRef, {
        source: "MITCHELL",
        mitchell: { tables: 6, rounds: 6, boardsPerRound: 3 },
      }),
    ).toBe(false);
  });

  it("matches a generated Mitchell on the defining spec fields", () => {
    expect(
      movementMatchesSelection(
        genSpecRef({ arrowSwitchRounds: 1, skip: true }),
        {
          source: "MITCHELL",
          mitchell: {
            tables: 6,
            rounds: 6,
            boardsPerRound: 3,
            arrowSwitchRounds: 1,
            skip: true,
          },
        },
      ),
    ).toBe(true);
  });

  it("normalises absent optional flags to false when comparing", () => {
    // Spec ref omits the flags entirely; selection sets them explicitly false.
    expect(
      movementMatchesSelection(genSpecRef(), {
        source: "MITCHELL",
        mitchell: {
          tables: 6,
          rounds: 6,
          boardsPerRound: 3,
          arrowSwitchRounds: 0,
          skip: false,
          shareAndRelay: false,
          hesitation: false,
          web: false,
        },
      }),
    ).toBe(true);
  });

  it("does not match when a defining field differs", () => {
    expect(
      movementMatchesSelection(genSpecRef({ tables: 6 }), {
        source: "MITCHELL",
        mitchell: { tables: 7, rounds: 6, boardsPerRound: 3 },
      }),
    ).toBe(false);
  });
});

const rec = (boardsPerPair: number, name: string): RecommendedMovement =>
  ({
    family: "MITCHELL",
    name,
    rounds: 6,
    boardsPerRound: 3,
    boardsPerPair,
    boardsInPlay: boardsPerPair,
    copies: 1,
    pros: [],
    cons: [],
    source: "generated",
    specRef: genSpecRef(),
  }) as any;

describe("groupByBoardsPerPair", () => {
  it("returns an empty array for no recommendations", () => {
    expect(groupByBoardsPerPair([])).toEqual([]);
  });

  it("groups by boards-per-pair ascending, collecting movements per group", () => {
    const a = rec(24, "A");
    const b = rec(18, "B");
    const c = rec(24, "C");

    const groups = groupByBoardsPerPair([a, b, c]);

    expect(groups.map((g) => g.boardsPerPair)).toEqual([18, 24]);
    expect(groups[0].movements).toEqual([b]);
    expect(groups[1].movements).toEqual([a, c]);
  });
});
