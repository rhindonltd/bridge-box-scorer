import { describe, it, expect } from "vitest";
import { splitLinesOfFile } from "./movement-file";

describe("splitLinesOfFile", () => {
  it("reads and groups lines from a movement file", () => {
    const groups = splitLinesOfFile("PSMovements.txt");
    // File should contain at least one group of movement data
    expect(groups.length).toBeGreaterThan(0);
    // Each group should have at least one line
    for (const group of groups) {
      expect(group.length).toBeGreaterThan(0);
    }
  });
});
