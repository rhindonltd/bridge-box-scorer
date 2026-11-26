import { describe, it, expect } from "vitest";
import {
  buildVoidMatch,
  invertVoidMatch,
  isVoidMatch,
  parseVoidMatch,
  VoidCause,
} from "./teams-match-void";

const CAUSES: VoidCause[] = [
  "SEATING_STANDARD",
  "SEATING_TD",
  "SHORT_OFFENDER_NS",
  "SHORT_OFFENDER_EW",
  "SHORT_BOTH",
  "SHORT_NEITHER",
];

describe("void-match token", () => {
  it("round-trips every cause", () => {
    for (const cause of CAUSES) {
      const token = buildVoidMatch(cause);
      expect(isVoidMatch(token)).toBe(true);
      expect(parseVoidMatch(token)).toBe(cause);
    }
  });

  it("rejects non-void outcomes", () => {
    expect(isVoidMatch("3NTN=")).toBe(false);
    expect(isVoidMatch("A60/40")).toBe(false);
    expect(isVoidMatch("TRM:EW_FAULT")).toBe(false);
    expect(parseVoidMatch("VOID:NOPE")).toBeNull();
  });
});

describe("invertVoidMatch", () => {
  it("flips the offender of a short match", () => {
    expect(invertVoidMatch("VOID:SHORT_OFFENDER_NS")).toBe(
      "VOID:SHORT_OFFENDER_EW",
    );
    expect(invertVoidMatch("VOID:SHORT_OFFENDER_EW")).toBe(
      "VOID:SHORT_OFFENDER_NS",
    );
  });

  it("leaves a cause that reads the same from either room", () => {
    expect(invertVoidMatch("VOID:SHORT_BOTH")).toBe("VOID:SHORT_BOTH");
    expect(invertVoidMatch("VOID:SEATING_TD")).toBe("VOID:SEATING_TD");
  });
});
