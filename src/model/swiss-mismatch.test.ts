import { describe, expect, it } from "vitest";
import {
  buildMismatch,
  parseMismatch,
  isMismatch,
  adjustMismatchVp,
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
    expect(buildMismatch({ side: "NS", direction: "HIGHER", fault: "NOT" })).toBe(
      "MM:NS:HIGHER:NOT",
    );
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

describe("adjustMismatchVp — §3.5.2", () => {
  const pool = 20;

  it("compensates a HIGHER + not-fault side upward (WB example: 12 → 14)", () => {
    // 5 + ¾ × 12 = 14.
    const r: MismatchRuling = { side: "NS", direction: "HIGHER", fault: "NOT" };
    expect(adjustMismatchVp(12, r, pool)).toBe(14);
  });

  it("docks a LOWER + own-fault side's excess over 5 (WB example: 13 → 11)", () => {
    // 13 − (13 − 5)/4 = 13 − 2 = 11.
    const r: MismatchRuling = { side: "NS", direction: "LOWER", fault: "OWN" };
    expect(adjustMismatchVp(13, r, pool)).toBe(11);
  });

  it("leaves HIGHER + own-fault unchanged", () => {
    const r: MismatchRuling = { side: "EW", direction: "HIGHER", fault: "OWN" };
    expect(adjustMismatchVp(12, r, pool)).toBe(12);
  });

  it("leaves LOWER + not-fault unchanged", () => {
    const r: MismatchRuling = { side: "EW", direction: "LOWER", fault: "NOT" };
    expect(adjustMismatchVp(13, r, pool)).toBe(13);
  });

  it("never docks below 5 for a LOWER + own-fault side at/under 5", () => {
    const r: MismatchRuling = { side: "NS", direction: "LOWER", fault: "OWN" };
    // actual 5 → excess 0 → unchanged.
    expect(adjustMismatchVp(5, r, pool)).toBe(5);
    // actual 3 → excess 0 (clamped) → unchanged.
    expect(adjustMismatchVp(3, r, pool)).toBe(3);
  });

  it("clamps the compensated value into [0, pool]", () => {
    const r: MismatchRuling = { side: "NS", direction: "HIGHER", fault: "NOT" };
    // 5 + ¾ × 20 = 20 (exactly the cap).
    expect(adjustMismatchVp(20, r, pool)).toBe(20);
  });

  it("uses base = pool/4 on the 10-VP triangular scale (2.5 + ¾ × actual)", () => {
    const r: MismatchRuling = { side: "NS", direction: "HIGHER", fault: "NOT" };
    // §3.5.2 triangular rule: 2.5 + ¾ × 6 = 7.
    expect(adjustMismatchVp(6, r, 10)).toBe(7);
    // 2.5 + ¾ × 8 = 8.5 (not clamped — within the 10 pool).
    expect(adjustMismatchVp(8, r, 10)).toBe(8.5);
  });

  it("docks over base = 2.5 for a LOWER + own-fault 10-VP comparison", () => {
    const r: MismatchRuling = { side: "NS", direction: "LOWER", fault: "OWN" };
    // 8 − (8 − 2.5)/4 = 8 − 1.375 = 6.625.
    expect(adjustMismatchVp(8, r, 10)).toBeCloseTo(6.625, 5);
    // At/under base: unchanged.
    expect(adjustMismatchVp(2, r, 10)).toBe(2);
  });
});
