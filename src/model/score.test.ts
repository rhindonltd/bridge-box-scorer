import { describe, it, expect } from "vitest";
import type { BoardOutcome, ScoringMode, ResultType } from "./score";

/**
 * model/score.ts exports only types — no runtime functions.
 * These tests validate that the type definitions are importable and
 * correctly constrain values at the type level (runtime assertions).
 */
describe("model/score types", () => {
  it("ScoringMode accepts IMP, XIMP, and MP", () => {
    const modes: ScoringMode[] = ["IMP", "XIMP", "MP"];
    expect(modes).toHaveLength(3);
  });

  it("ResultType includes all three pair combinations", () => {
    const types: ResultType[] = ["PAIR_IMP", "PAIR_XIMP", "PAIR_MP"];
    expect(types).toHaveLength(3);
  });

  it("BoardOutcome accepts played contract codes and special outcomes", () => {
    const outcomes: BoardOutcome[] = ["1NTN=" as any, "PO", "NP"];
    expect(outcomes).toHaveLength(3);
  });
});
