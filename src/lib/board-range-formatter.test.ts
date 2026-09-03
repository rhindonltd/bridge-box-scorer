import { describe, it, expect } from "vitest";

import { formatBoardRange } from "./board-range-formatter";

describe("formatBoardRange", () => {
  it("returns an empty string for no boards", () => {
    expect(formatBoardRange([])).toBe("");
  });

  it("returns the single board number as a string", () => {
    expect(formatBoardRange([7])).toBe("7");
  });

  it("formats a consecutive run as 'first to last'", () => {
    expect(formatBoardRange([1, 2, 3, 4])).toBe("1 to 4");
  });

  it("sorts before deciding consecutiveness", () => {
    expect(formatBoardRange([4, 1, 3, 2])).toBe("1 to 4");
  });

  it("joins non-consecutive boards with commas (sorted)", () => {
    expect(formatBoardRange([1, 2, 4])).toBe("1, 2, 4");
    expect(formatBoardRange([5, 1, 9])).toBe("1, 5, 9");
  });

  it("treats a two-board consecutive pair as a range", () => {
    expect(formatBoardRange([9, 10])).toBe("9 to 10");
  });
});
