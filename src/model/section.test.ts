import { describe, it, expect } from "vitest";

import {
  MIN_SECTION_TABLES,
  canSplitSection,
  isSeatInSections,
} from "./section";

describe("canSplitSection", () => {
  it("needs at least two minimum-size sections' worth of tables", () => {
    expect(MIN_SECTION_TABLES).toBe(2);
    // Below 2 * MIN cannot split (one side would drop under the minimum).
    expect(canSplitSection(1)).toBe(false);
    expect(canSplitSection(2)).toBe(false);
    expect(canSplitSection(3)).toBe(false);
    // Exactly 2 * MIN splits into MIN/MIN.
    expect(canSplitSection(4)).toBe(true);
    expect(canSplitSection(8)).toBe(true);
  });
});

describe("isSeatInSections", () => {
  const sections = [
    { section: "A", tables: 4 },
    { section: "B", tables: 2 },
  ];

  it("accepts a seat within its section's table range", () => {
    expect(isSeatInSections("A1NS", sections)).toBe(true);
    expect(isSeatInSections("A4EW", sections)).toBe(true);
    expect(isSeatInSections("B2NS", sections)).toBe(true);
  });

  it("rejects a table number beyond the section's count", () => {
    // A was shrunk to 4 (e.g. by a split), so A5 no longer exists.
    expect(isSeatInSections("A5NS", sections)).toBe(false);
    expect(isSeatInSections("B3NS", sections)).toBe(false);
  });

  it("rejects a seat in an unknown section", () => {
    expect(isSeatInSections("C1NS", sections)).toBe(false);
  });

  it("rejects an unparseable seat", () => {
    expect(isSeatInSections("not-a-seat", sections)).toBe(false);
    expect(isSeatInSections("3NS", sections)).toBe(false);
  });
});
