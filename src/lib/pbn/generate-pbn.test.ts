import { describe, it, expect } from "vitest";
import { generatePbn, formatPbnDate, type PbnData } from "./generate-pbn";
import type { Deal } from "@/model/common";

/**
 * A minimal (not necessarily legal) deal — `toPbn` just serialises whatever
 * cards each hand holds, so a couple of cards per direction is enough to
 * exercise the export without hand-crafting a full 52-card pack.
 */
function deal(): Deal {
  return {
    N: ["SA", "HK"],
    E: ["SK", "HQ"],
    S: ["SQ", "HJ"],
    W: ["SJ", "HT"],
  };
}

function data(overrides: Partial<PbnData> = {}): PbnData {
  return {
    eventName: "Club Game",
    eventDate: "2026-09-17",
    site: "Club",
    deals: new Map([[1, deal()]]),
    ...overrides,
  };
}

describe("formatPbnDate", () => {
  it("formats an ISO date as YYYY.MM.DD (zero-padded)", () => {
    expect(formatPbnDate("2026-01-05")).toBe("2026.01.05");
  });

  it("returns the raw input unchanged when it cannot be parsed", () => {
    expect(formatPbnDate("not-a-date")).toBe("not-a-date");
  });
});

describe("generatePbn", () => {
  it("returns an empty string when no board has a deal", () => {
    expect(generatePbn(data({ deals: new Map() }))).toBe("");
  });

  it("emits a tag block for a board and ends with a trailing newline", () => {
    const out = generatePbn(data());

    expect(out.endsWith("\n")).toBe(true);
    expect(out).toContain('[Event "Club Game"]');
    expect(out).toContain('[Site "Club"]');
    expect(out).toContain('[Date "2026.09.17"]');
    expect(out).toContain('[Board "1"]');
    // Empty seat-name tags in West/North/East/South order.
    expect(out).toContain('[West ""]');
    expect(out).toContain('[North ""]');
    expect(out).toContain('[East ""]');
    expect(out).toContain('[South ""]');
    // Board 1's dealer is North, so the Deal tag starts "N:".
    expect(out).toContain('[Deal "N:');
  });

  it("emits boards in ascending order separated by a blank line", () => {
    const out = generatePbn(
      data({
        deals: new Map([
          [3, deal()],
          [1, deal()],
        ]),
      }),
    );

    const board1 = out.indexOf('[Board "1"]');
    const board3 = out.indexOf('[Board "3"]');
    expect(board1).toBeGreaterThanOrEqual(0);
    expect(board3).toBeGreaterThan(board1);
    // Blocks are separated by exactly one blank line.
    expect(out).toContain("]\n\n[Event");
  });

  it("uses the dealer that matches the board number (board 2 = East)", () => {
    const out = generatePbn(data({ deals: new Map([[2, deal()]]) }));
    expect(out).toContain('[Deal "E:');
  });

  it("escapes embedded quotes in tag values", () => {
    const out = generatePbn(
      data({ eventName: 'The "Big" Game', site: 'St "Mary" Hall' }),
    );
    expect(out).toContain('[Event "The \\"Big\\" Game"]');
    expect(out).toContain('[Site "St \\"Mary\\" Hall"]');
  });

  it("falls back to the raw date string when it is unparseable", () => {
    const out = generatePbn(data({ eventDate: "whenever" }));
    expect(out).toContain('[Date "whenever"]');
  });
});
