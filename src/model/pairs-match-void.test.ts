import { describe, it, expect } from "vitest";
import {
  buildPairVoid,
  isPairVoid,
  parsePairVoid,
  pairVoidFaults,
  PairsVoidCause,
} from "./pairs-match-void";

const CAUSES: PairsVoidCause[] = [
  "OFFENDER_NS",
  "OFFENDER_EW",
  "BOTH",
  "NEITHER",
];

describe("pairs-match-void token", () => {
  it("round-trips every cause", () => {
    for (const cause of CAUSES) {
      const token = buildPairVoid(cause);
      expect(isPairVoid(token)).toBe(true);
      expect(parsePairVoid(token)).toBe(cause);
    }
  });

  it("rejects non-pairs-void outcomes", () => {
    expect(isPairVoid("3NTN=")).toBe(false);
    expect(isPairVoid("A60/40")).toBe(false);
    expect(isPairVoid("VOID:SEATING_STANDARD")).toBe(false); // teams token
    expect(parsePairVoid("VOIDP:NOPE")).toBeNull();
  });
});

describe("pairVoidFaults", () => {
  it("gives the offender AVE- and the non-offender AVE+", () => {
    expect(pairVoidFaults("OFFENDER_NS")).toEqual({
      ns: "AVE_MINUS",
      ew: "AVE_PLUS",
    });
    expect(pairVoidFaults("OFFENDER_EW")).toEqual({
      ns: "AVE_PLUS",
      ew: "AVE_MINUS",
    });
  });

  it("gives both AVE- for both-at-fault and both AVE+ for neither", () => {
    expect(pairVoidFaults("BOTH")).toEqual({
      ns: "AVE_MINUS",
      ew: "AVE_MINUS",
    });
    expect(pairVoidFaults("NEITHER")).toEqual({
      ns: "AVE_PLUS",
      ew: "AVE_PLUS",
    });
  });
});
