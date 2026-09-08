import { describe, it, expect } from "vitest";

import { parseEbuCsv } from "@/db/players/actions/sync-from-ebu";

/**
 * Unit coverage for the pure EBU CSV parser. No network, no DB — just the
 * parse/map/validate behaviour, including the two guards.
 */

/** Build a CSV string of `count` well-formed EBU rows: `ebu,first,last`. */
function makeCsv(count: number, startAt = 1): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const ebu = startAt + i;
    lines.push(`${ebu},First${ebu},Last${ebu}`);
  }
  return lines.join("\n");
}

describe("parseEbuCsv", () => {
  it("maps well-formed rows to Player objects", () => {
    const players = parseEbuCsv(makeCsv(1000));

    expect(players).toHaveLength(1000);
    expect(players[0]).toEqual({
      ebuNumber: 1,
      firstName: "First1",
      lastName: "Last1",
    });
  });

  it("trims names and coalesces blank names to null", () => {
    // 1000 valid rows plus one with padded/blank names at the front.
    const csv = `42,  Padded  ,  \n${makeCsv(1000, 100)}`;
    const players = parseEbuCsv(csv);

    const padded = players.find((p) => p.ebuNumber === 42);
    expect(padded).toEqual({
      ebuNumber: 42,
      firstName: "Padded",
      lastName: null,
    });
  });

  it("throws when the first cell is not numeric (unexpected format)", () => {
    const csv = `name,first,last\n${makeCsv(1000)}`;
    expect(() => parseEbuCsv(csv)).toThrow("Unexpected CSV format from EBU");
  });

  it("throws when the file is suspiciously small", () => {
    expect(() => parseEbuCsv(makeCsv(999))).toThrow(
      "suspiciously small",
    );
  });
});
