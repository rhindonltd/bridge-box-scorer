import { describe, it, expect } from "vitest";
import {
  swissPairIdFromParticipant,
  swissPairIdFromSeat,
} from "./swiss-board-history";

const TABLES = 3;

// getSwissBoardHistory now reads the first-class `matches` table (for structure)
// alongside `boards` (for direction counts), so it is exercised end-to-end in
// swiss-board-history.int.test.ts against real materialised rows rather than
// mocked board rows. Only the pure id decoders are unit-tested here.
describe("swissPairIdFromParticipant", () => {
  it("decodes a bare, section-qualified board id to its stable pair id", () => {
    // A Swiss board id IS the bare pair number (no compass direction).
    expect(swissPairIdFromParticipant("A1", TABLES)).toBe(1);
    expect(swissPairIdFromParticipant("A4", TABLES)).toBe(4);
    // The section letter is irrelevant to the id.
    expect(swissPairIdFromParticipant("B6", TABLES)).toBe(6);
  });

  it("returns null for a non-id participant (e.g. a sit-out phantom)", () => {
    expect(swissPairIdFromParticipant("SIT_OUT", TABLES)).toBeNull();
    // A directional seat is NOT a board id — it must not decode here.
    expect(swissPairIdFromParticipant("A1NS", TABLES)).toBeNull();
  });
});

describe("swissPairIdFromSeat", () => {
  it("decodes a physical round-1 home seat to its stable pair id", () => {
    // Table 1 NS is pair 1; table 1 EW is pair tables + 1.
    expect(swissPairIdFromSeat("A1NS", TABLES)).toBe(1);
    expect(swissPairIdFromSeat("A1EW", TABLES)).toBe(TABLES + 1);
  });

  it("returns null for a non-seat (e.g. a sit-out phantom or a bare id)", () => {
    expect(swissPairIdFromSeat("SIT_OUT", TABLES)).toBeNull();
    expect(swissPairIdFromSeat("A1", TABLES)).toBeNull();
  });
});
