import { describe, it, expect } from "vitest";
import { nextSectionLetter } from "./section-letter";

describe("nextSectionLetter", () => {
  it("returns A when no sections exist yet", () => {
    expect(nextSectionLetter([])).toBe("A");
  });

  it("returns the next unused letter in order", () => {
    expect(nextSectionLetter(["A"])).toBe("B");
    expect(nextSectionLetter(["A", "B", "C"])).toBe("D");
  });

  it("fills a gap rather than always appending", () => {
    // B is free even though C is used.
    expect(nextSectionLetter(["A", "C"])).toBe("B");
  });

  it("falls back to a numbered suffix once all 26 letters are taken", () => {
    const allLetters = Array.from({ length: 26 }, (_, i) =>
      String.fromCharCode(65 + i),
    );
    expect(nextSectionLetter(allLetters)).toBe("Z26");
  });
});
