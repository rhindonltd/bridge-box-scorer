import { describe, it, expect } from "vitest";
import { rehydrateSelectedMovement } from "./movement-rehydration";
import { SelectedMovement } from "@/model/selected-movement";

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
});
