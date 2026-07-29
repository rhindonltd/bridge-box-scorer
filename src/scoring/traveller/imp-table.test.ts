import { describe, it, expect } from "vitest";
import { ImpTable } from "./imp-table";

describe("ImpTable.calculateImps", () => {
  it("returns 0 for score difference of 0", () => {
    expect(ImpTable.calculateImps(0)).toBe(0);
  });

  it("returns 0 for score difference of 10", () => {
    expect(ImpTable.calculateImps(10)).toBe(0);
  });

  it("returns 1 for score difference of 20", () => {
    expect(ImpTable.calculateImps(20)).toBe(1);
  });

  it("returns 1 for score difference of 40", () => {
    expect(ImpTable.calculateImps(40)).toBe(1);
  });

  it("returns 2 for score difference of 50", () => {
    expect(ImpTable.calculateImps(50)).toBe(2);
  });

  it("returns 3 for score difference of 90", () => {
    expect(ImpTable.calculateImps(90)).toBe(3);
  });

  it("returns 10 for score difference of 430", () => {
    expect(ImpTable.calculateImps(430)).toBe(10);
  });

  it("returns 13 for score difference of 750", () => {
    expect(ImpTable.calculateImps(750)).toBe(13);
  });

  it("returns 24 for score difference of 4000", () => {
    expect(ImpTable.calculateImps(4000)).toBe(24);
  });

  it("returns negative IMPs for negative score differences", () => {
    expect(ImpTable.calculateImps(-20)).toBe(-1);
    expect(ImpTable.calculateImps(-90)).toBe(-3);
    expect(ImpTable.calculateImps(-430)).toBe(-10);
    expect(ImpTable.calculateImps(-750)).toBe(-13);
  });

  it("handles boundary values correctly", () => {
    // At the boundary between 1 and 2 IMPs
    expect(ImpTable.calculateImps(40)).toBe(1);
    expect(ImpTable.calculateImps(50)).toBe(2);

    // At the boundary between 2 and 3 IMPs
    expect(ImpTable.calculateImps(80)).toBe(2);
    expect(ImpTable.calculateImps(90)).toBe(3);
  });

  it("throws for scores between ranges (gaps in the table)", () => {
    // There are gaps: 11-19, 41-49 etc.
    expect(() => ImpTable.calculateImps(15)).toThrow(
      "Score outside IMP table range",
    );
    expect(() => ImpTable.calculateImps(45)).toThrow(
      "Score outside IMP table range",
    );
  });

  it("throws for scores above maximum range", () => {
    expect(() => ImpTable.calculateImps(7601)).toThrow(
      "Score outside IMP table range",
    );
  });
});
