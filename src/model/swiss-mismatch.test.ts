import { describe, expect, it } from "vitest";
import {
  buildMismatch,
  invertMismatchSide,
  parseMismatch,
  parseMismatches,
  withMismatch,
  isMismatch,
  MismatchRuling,
} from "./swiss-mismatch";

describe("mismatch token codec", () => {
  it("round-trips every ruling through build/parse", () => {
    const sides = ["NS", "EW"] as const;
    const directions = ["HIGHER", "LOWER"] as const;
    const faults = ["OWN", "NOT"] as const;
    for (const side of sides) {
      for (const direction of directions) {
        for (const fault of faults) {
          const ruling: MismatchRuling = { side, direction, fault };
          const token = buildMismatch(ruling);
          expect(isMismatch(token)).toBe(true);
          expect(parseMismatch(token)).toEqual(ruling);
        }
      }
    }
  });

  it("builds the documented token shape", () => {
    expect(
      buildMismatch({ side: "NS", direction: "HIGHER", fault: "NOT" }),
    ).toBe("MM:NS:HIGHER:NOT");
  });

  it("rejects non-mismatch and malformed tokens", () => {
    expect(parseMismatch("3NTN=")).toBeNull();
    expect(parseMismatch("VOID:SHORT_BOTH")).toBeNull();
    expect(parseMismatch("MM:NS:HIGHER")).toBeNull(); // too few parts
    expect(parseMismatch("MM:XX:HIGHER:NOT")).toBeNull(); // bad side
    expect(parseMismatch("MM:NS:SIDEWAYS:NOT")).toBeNull(); // bad direction
    expect(parseMismatch("MM:NS:HIGHER:MAYBE")).toBeNull(); // bad fault
    expect(isMismatch("MM:bad")).toBe(false);
  });
});

describe("rulings for both sides of one match", () => {
  const nsHigher: MismatchRuling = {
    side: "NS",
    direction: "HIGHER",
    fault: "NOT",
  };
  const ewLower: MismatchRuling = {
    side: "EW",
    direction: "LOWER",
    fault: "OWN",
  };

  it("adds a ruling to an unruled match", () => {
    expect(withMismatch(null, nsHigher)).toBe("MM:NS:HIGHER:NOT");
  });

  it("keeps the other side's ruling, NS first whichever is ruled first", () => {
    const both = withMismatch(withMismatch(null, ewLower), nsHigher);
    expect(both).toBe("MM:NS:HIGHER:NOT;MM:EW:LOWER:OWN");
    expect(parseMismatches(both)).toEqual([nsHigher, ewLower]);
    expect(isMismatch(both)).toBe(true);
  });

  it("replaces a ruling for the same side", () => {
    const both = withMismatch(withMismatch(null, nsHigher), ewLower);
    const changed: MismatchRuling = {
      side: "EW",
      direction: "LOWER",
      fault: "NOT",
    };
    expect(parseMismatches(withMismatch(both, changed))).toEqual([
      nsHigher,
      changed,
    ]);
  });

  it("replaces a non-mismatch ruling (e.g. a void)", () => {
    expect(withMismatch("VOIDP:BOTH", ewLower)).toBe("MM:EW:LOWER:OWN");
  });

  it("reads a single ruling as one, and anything else as none", () => {
    expect(parseMismatches("MM:EW:LOWER:OWN")).toEqual([ewLower]);
    expect(parseMismatches("VOID:SEATING_TD")).toEqual([]);
    expect(parseMismatches("MM:NS:HIGHER:NOT;VOID:SEATING_TD")).toEqual([]);
    // Two rulings for the same side are not a valid value.
    expect(parseMismatches("MM:NS:HIGHER:NOT;MM:NS:LOWER:OWN")).toEqual([]);
  });
});

describe("invertMismatchSide", () => {
  it("flips the ruled side", () => {
    expect(invertMismatchSide("MM:NS:HIGHER:OWN")).toBe("MM:EW:HIGHER:OWN");
    expect(invertMismatchSide("MM:EW:LOWER:NOT")).toBe("MM:NS:LOWER:NOT");
  });

  it("leaves anything that is not a single mismatch token", () => {
    expect(invertMismatchSide("VOID:SHORT_BOTH")).toBe("VOID:SHORT_BOTH");
    expect(invertMismatchSide("XX:NS:HIGHER:OWN")).toBe("XX:NS:HIGHER:OWN");
  });
});
