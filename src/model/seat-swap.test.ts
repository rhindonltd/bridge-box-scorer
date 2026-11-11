import { describe, it, expect } from "vitest";
import { applySeatSwap, applySeatSwaps } from "./seat-swap";

const row = (over: Partial<Parameters<typeof applySeatSwap>[0]> = {}) => ({
  ns: "A1NS",
  ew: "A2EW",
  confirmedResult: "3NTN=",
  status: "CONFIRMED",
  seatsSwapped: false,
  ...over,
});

describe("applySeatSwap", () => {
  it("returns an unflagged row untouched", () => {
    const r = row();
    expect(applySeatSwap(r)).toBe(r);
  });

  it("treats a missing or null flag as unflagged", () => {
    const missing = { ns: "A1", ew: "A2" };
    expect(applySeatSwap(missing)).toBe(missing);
    const nul = { ns: "A1", ew: "A2", seatsSwapped: null };
    expect(applySeatSwap(nul)).toBe(nul);
  });

  it("exchanges ns and ew on a flagged row and keeps everything else", () => {
    const swapped = applySeatSwap(row({ seatsSwapped: true }));
    expect(swapped).toEqual(
      row({ ns: "A2EW", ew: "A1NS", seatsSwapped: true }),
    );
    expect(swapped.confirmedResult).toBe("3NTN=");
    expect(swapped.status).toBe("CONFIRMED");
  });

  it("swaps bare ids (arrow-switch / Swiss style) as well as suffixed ids", () => {
    const swapped = applySeatSwap({ ns: "A1", ew: "A5", seatsSwapped: true });
    expect(swapped.ns).toBe("A5");
    expect(swapped.ew).toBe("A1");
  });

  it("does not mutate its input", () => {
    const r = row({ seatsSwapped: true });
    applySeatSwap(r);
    expect(r.ns).toBe("A1NS");
    expect(r.ew).toBe("A2EW");
  });
});

describe("applySeatSwaps", () => {
  it("swaps only the flagged rows in a mixed list, preserving order", () => {
    const rows = [
      row({ ns: "A1NS", ew: "A1EW" }),
      row({ ns: "A2NS", ew: "A2EW", seatsSwapped: true }),
      row({ ns: "A3NS", ew: "A3EW" }),
    ];
    const out = applySeatSwaps(rows);
    expect(out.map((r) => [r.ns, r.ew])).toEqual([
      ["A1NS", "A1EW"],
      ["A2EW", "A2NS"],
      ["A3NS", "A3EW"],
    ]);
    expect(out).not.toBe(rows);
    expect(rows[1].ns).toBe("A2NS");
  });

  it("returns an empty array for no rows", () => {
    expect(applySeatSwaps([])).toEqual([]);
  });
});
