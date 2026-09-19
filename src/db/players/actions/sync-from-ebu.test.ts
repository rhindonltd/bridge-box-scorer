import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/db/players/actions/sync-ebu-players", () => ({
  syncPlayers: vi.fn(),
}));

import { syncPlayers } from "@/db/players/actions/sync-ebu-players";
import {
  parseEbuCsv,
  fetchPlayersCsv,
  syncPlayersFromEbu,
  EBU_PLAYERS_URL,
} from "./sync-from-ebu";

/** A CSV with `n` valid data rows: "ebuNo,first,last". */
function csvWith(n: number): string {
  const lines = [];
  for (let i = 1; i <= n; i++) {
    lines.push(`${100000 + i},First${i},Last${i}`);
  }
  return lines.join("\n");
}

describe("parseEbuCsv", () => {
  it("maps rows to Player records (trimming names)", () => {
    const csv = ["100001, Ada , Lovelace ", ...csvBody(1500)].join("\n");
    const players = parseEbuCsv(csv);
    expect(players[0]).toEqual({
      ebuNumber: 100001,
      firstName: "Ada",
      lastName: "Lovelace",
    });
    expect(players.length).toBeGreaterThanOrEqual(1000);
  });

  it("drops rows with no/zero EBU number", () => {
    // A valid first row (so format check passes) then a 0-number row.
    const csv = ["100001,A,B", "0,X,Y", ...csvBody(1500)].join("\n");
    const players = parseEbuCsv(csv);
    expect(players.some((p) => p.firstName === "X")).toBe(false);
  });

  it("blanks empty names to null", () => {
    const csv = ["100001,,", ...csvBody(1500)].join("\n");
    const players = parseEbuCsv(csv);
    expect(players[0]).toEqual({
      ebuNumber: 100001,
      firstName: null,
      lastName: null,
    });
  });

  it("throws when the first cell is not a number (unexpected format)", () => {
    expect(() => parseEbuCsv("name,first,last\n1,a,b")).toThrow(
      "Unexpected CSV format from EBU",
    );
  });

  it("throws when the file is suspiciously small", () => {
    expect(() => parseEbuCsv(csvWith(5))).toThrow("suspiciously small");
  });
});

/** N extra valid rows (used to pad past the MIN_EXPECTED_ROWS guard). */
function csvBody(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${200000 + i},F${i},L${i}`);
}

describe("fetchPlayersCsv", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the EBU url and returns the body text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "csv-body",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPlayersCsv()).resolves.toBe("csv-body");
    expect(fetchMock).toHaveBeenCalledWith(EBU_PLAYERS_URL);
  });

  it("throws on a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await expect(fetchPlayersCsv()).rejects.toThrow("Failed to fetch CSV: 503");
  });
});

describe("syncPlayersFromEbu", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("fetches, parses and writes, returning the written count", async () => {
    const csv = ["100001,A,B", ...csvBody(1500)].join("\n");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => csv }),
    );

    const result = await syncPlayersFromEbu();

    expect(vi.mocked(syncPlayers)).toHaveBeenCalledTimes(1);
    expect(result.count).toBe(1501);
  });
});
