import { describe, it, expect, vi, beforeEach } from "vitest";

const insertValues = vi.fn();
const mockDb = {
  insert: () => ({ values: (v: unknown) => insertValues(v) }),
};
vi.mock("@/db/system", () => ({ getDb: () => Promise.resolve(mockDb) }));

import { createSeatTransferCode } from "./create-seat-transfer-code";

describe("createSeatTransferCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a 6-char code bound to the game + seat, unused, with an expiry", async () => {
    const before = Date.now();
    const code = await createSeatTransferCode("g1", "A3NS");

    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(insertValues).toHaveBeenCalledTimes(1);

    const row = insertValues.mock.calls[0][0] as {
      code: string;
      gameId: string;
      seat: string;
      expiresAt: string;
      used: number;
    };
    expect(row.code).toBe(code);
    expect(row.gameId).toBe("g1");
    expect(row.seat).toBe("A3NS");
    expect(row.used).toBe(0);
    // Expiry is ~5 minutes out.
    const expiry = new Date(row.expiresAt).getTime();
    expect(expiry).toBeGreaterThan(before + 4 * 60 * 1000);
    expect(expiry).toBeLessThan(before + 6 * 60 * 1000);
  });
});
