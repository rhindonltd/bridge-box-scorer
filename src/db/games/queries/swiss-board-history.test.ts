import { describe, it, expect } from "vitest";
import { swissPairIdFromParticipant } from "./swiss-board-history";

const TABLES = 3;

// getSwissBoardHistory now reads the first-class `matches` table (for structure)
// alongside `boards` (for direction counts), so it is exercised end-to-end in
// swiss-board-history.int.test.ts against real materialised rows rather than
// mocked board rows. Only the pure id decoder is unit-tested here.
describe("swissPairIdFromParticipant", () => {
  it("decodes a valid section-qualified home seat to a stable pair id", () => {
    // Table 1 NS is pair 1.
    expect(swissPairIdFromParticipant("A1NS", TABLES)).toBe(1);
    // Table 1 EW is pair tables + 1.
    expect(swissPairIdFromParticipant("A1EW", TABLES)).toBe(TABLES + 1);
  });

  it("returns null for a non-seat participant (e.g. a sit-out phantom)", () => {
    expect(swissPairIdFromParticipant("SIT_OUT", TABLES)).toBeNull();
  });
});
