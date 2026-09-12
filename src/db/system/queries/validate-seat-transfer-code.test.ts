import { describe, it, expect, vi, beforeEach } from "vitest";

// A single "current record" the mocked select returns; tests set it.
let record: {
  code: string;
  gameId: string;
  seat: string;
  expiresAt: string;
  used: number;
} | null = null;

const updateSet = vi.fn();
const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({ get: () => Promise.resolve(record) }),
    }),
  }),
  update: () => ({
    set: (v: unknown) => {
      updateSet(v);
      return { where: () => Promise.resolve(undefined) };
    },
  }),
};
vi.mock("@/db/system", () => ({ getDb: () => Promise.resolve(mockDb) }));

vi.mock("@/db/games/actions/rotate-participant-secret", () => ({
  rotateParticipantSecret: vi.fn(),
}));

import { validateAndClaimSeatTransferCode } from "./validate-seat-transfer-code";
import { rotateParticipantSecret } from "@/db/games/actions/rotate-participant-secret";

function futureIso() {
  return new Date(Date.now() + 60_000).toISOString();
}
function pastIso() {
  return new Date(Date.now() - 60_000).toISOString();
}

describe("validateAndClaimSeatTransferCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    record = null;
    vi.mocked(rotateParticipantSecret).mockResolvedValue(true);
  });

  it("claims a valid code, rotates the seat secret, marks used, returns the new token", async () => {
    record = {
      code: "ABC234",
      gameId: "g1",
      seat: "A3NS",
      expiresAt: futureIso(),
      used: 0,
    };

    const result = await validateAndClaimSeatTransferCode("abc234");

    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid");
    expect(result.gameId).toBe("g1");
    expect(result.seat).toBe("A3NS");
    expect(typeof result.token).toBe("string");
    // The rotated secret is the token handed back to the new device.
    expect(rotateParticipantSecret).toHaveBeenCalledWith(
      "g1",
      "A3NS",
      result.token,
    );
    // Code consumed.
    expect(updateSet).toHaveBeenCalledWith({ used: 1 });
  });

  it("rejects an unknown code without rotating", async () => {
    record = null;
    const result = await validateAndClaimSeatTransferCode("ZZZZZZ");
    expect(result).toEqual({ valid: false, error: "Invalid code" });
    expect(rotateParticipantSecret).not.toHaveBeenCalled();
  });

  it("rejects an already-used code without rotating", async () => {
    record = {
      code: "USED11",
      gameId: "g1",
      seat: "A3NS",
      expiresAt: futureIso(),
      used: 1,
    };
    const result = await validateAndClaimSeatTransferCode("USED11");
    expect(result).toEqual({
      valid: false,
      error: "Code has already been used",
    });
    expect(rotateParticipantSecret).not.toHaveBeenCalled();
  });

  it("rejects an expired code without rotating", async () => {
    record = {
      code: "OLD222",
      gameId: "g1",
      seat: "A3NS",
      expiresAt: pastIso(),
      used: 0,
    };
    const result = await validateAndClaimSeatTransferCode("OLD222");
    expect(result).toEqual({ valid: false, error: "Code has expired" });
    expect(rotateParticipantSecret).not.toHaveBeenCalled();
  });

  it("rejects (and consumes) a code whose seat is no longer occupied", async () => {
    record = {
      code: "GONE22",
      gameId: "g1",
      seat: "A3NS",
      expiresAt: futureIso(),
      used: 0,
    };
    vi.mocked(rotateParticipantSecret).mockResolvedValue(false);

    const result = await validateAndClaimSeatTransferCode("GONE22");

    expect(result).toEqual({
      valid: false,
      error: "That seat is no longer occupied.",
    });
    // Still consumed so a stale code can't linger.
    expect(updateSet).toHaveBeenCalledWith({ used: 1 });
  });
});
