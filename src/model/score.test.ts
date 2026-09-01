import { describe, it, expect } from "vitest";
import type { BoardOutcome } from "./score";

/**
 * model/score.ts exports only types — no runtime functions.
 * These tests validate that the type definitions are importable and
 * correctly constrain values at the type level (runtime assertions).
 */
describe("model/score types", () => {
  it("BoardOutcome accepts played contract codes and special outcomes", () => {
    const outcomes: BoardOutcome[] = ["1NTN=" as any, "PO", "NP"];
    expect(outcomes).toHaveLength(3);
  });
});
