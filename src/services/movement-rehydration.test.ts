import { describe, it, expect, vi, beforeEach } from "vitest";
import { rehydrateSelectedMovement } from "./movement-rehydration";
import { SelectedMovement } from "@/model/selected-movement";

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
}));

vi.mock("@/db/movements/queries/get-movement-spec", () => ({
  getPairMovementSpecById: vi.fn(),
}));

import { getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";

type MitchellSpec = Extract<
  SelectedMovement,
  { source: "MITCHELL" }
>["mitchell"];

/**
 * These cover the MITCHELL rehydration branch, which is pure generation (no DB
 * access). The SPEC branch loads seeded rows and is exercised elsewhere.
 */
describe("rehydrateSelectedMovement — Mitchell variants", () => {
  function mitchell(spec: MitchellSpec): SelectedMovement {
    return { source: "MITCHELL", mitchell: spec };
  }

  it("regenerates a Standard Mitchell and flags it as standard", async () => {
    const result = await rehydrateSelectedMovement(
      mitchell({ tables: 5, rounds: 5, boardsPerRound: 4 }),
    );

    expect(result.isStandardMitchell).toBe(true);
    expect(result.movement).toHaveLength(5);
    // Standard Mitchell: rounds === spec.rounds.
    expect(result.movement[0].rounds).toHaveLength(5);
  });

  it("builds a Skip Mitchell (fewer rounds than tables) — not standard", async () => {
    const result = await rehydrateSelectedMovement(
      mitchell({ tables: 6, rounds: 5, boardsPerRound: 4, skip: true }),
    );

    expect(result.isStandardMitchell).toBe(false);
    expect(result.movement).toHaveLength(6);
    expect(result.movement[0].rounds).toHaveLength(5);
  });

  it("builds a Share and Relay Mitchell (rounds === tables) — not standard", async () => {
    const result = await rehydrateSelectedMovement(
      mitchell({ tables: 6, rounds: 6, boardsPerRound: 4, shareAndRelay: true }),
    );

    expect(result.isStandardMitchell).toBe(false);
    expect(result.movement).toHaveLength(6);
    expect(result.movement[0].rounds).toHaveLength(6);
  });

  it("builds a Hesitation Mitchell (tables + 1 rounds) — not standard", async () => {
    const result = await rehydrateSelectedMovement(
      mitchell({ tables: 5, rounds: 6, boardsPerRound: 3, hesitation: true }),
    );

    expect(result.isStandardMitchell).toBe(false);
    expect(result.movement).toHaveLength(5);
    // Hesitation Mitchell always produces tables + 1 rounds.
    expect(result.movement[0].rounds).toHaveLength(6);
  });

  it("builds a Web Mitchell — not standard, with board copies populated", async () => {
    const result = await rehydrateSelectedMovement(
      mitchell({ tables: 14, rounds: 8, boardsPerRound: 3, web: true }),
    );

    expect(result.isStandardMitchell).toBe(false);
    expect(result.movement).toHaveLength(14);
    expect(result.movement[0].rounds).toHaveLength(8);

    // First half plays copy A, second half copy B.
    const firstHalf = result.movement.find((t) => t.tableNumber === 1);
    const secondHalf = result.movement.find((t) => t.tableNumber === 14);
    expect(firstHalf?.rounds.every((r) => r.boardCopy === "A")).toBe(true);
    expect(secondHalf?.rounds.every((r) => r.boardCopy === "B")).toBe(true);
  });
});

describe("rehydrateSelectedMovement — SPEC source", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function specSelection(): SelectedMovement {
    return { source: "SPEC", specId: 42, boardsPerRound: 2 };
  }

  const movementRows = [
    {
      id: 1,
      movementId: 42,
      tableNumber: 1,
      rounds: [
        { roundNumber: 1, ns: "1", ew: "2", boardSet: 1 },
        { roundNumber: 2, ns: "1", ew: "3", boardSet: 2 },
      ],
    },
  ];

  it("expands board sets into concrete ranges and exposes a positive missing pair", async () => {
    vi.mocked(getPairMovement).mockResolvedValue(movementRows as any);
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      missingPair: 3,
    } as any);

    const result = await rehydrateSelectedMovement(specSelection());

    expect(result.isStandardMitchell).toBe(false);
    expect(result.missingPair).toBe("3");
    expect(result.movement).toHaveLength(1);
    expect(result.movement[0].rounds).toEqual([
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

  it("returns a null missing pair when the spec has none (0 / missing)", async () => {
    vi.mocked(getPairMovement).mockResolvedValue(movementRows as any);
    // missingPair === 0 exercises the `> 0` false branch.
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      missingPair: 0,
    } as any);

    const result = await rehydrateSelectedMovement(specSelection());

    expect(result.missingPair).toBeNull();
  });

  it("returns a null missing pair when the spec is not found", async () => {
    vi.mocked(getPairMovement).mockResolvedValue(movementRows as any);
    // spec == null exercises the `!= null` false branch.
    vi.mocked(getPairMovementSpecById).mockResolvedValue(undefined as any);

    const result = await rehydrateSelectedMovement(specSelection());

    expect(result.missingPair).toBeNull();
  });
});
