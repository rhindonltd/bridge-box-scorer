import { describe, it, expect, vi, beforeEach } from "vitest";

// A single "current record" the mocked select returns; tests set it.
let record: {
  code: string;
  gameId: string;
  seat: string;
  expiresAt: string;
  used: number;
  kind: "CHANGE_DEVICE" | "HANDOVER";
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

vi.mock("@/db/games/actions/handover-seat", () => ({
  handoverSeat: vi.fn(),
}));

import {
  validateAndClaimSeatTransferCode,
  inspectSeatTransferCode,
} from "./validate-seat-transfer-code";
import { rotateParticipantSecret } from "@/db/games/actions/rotate-participant-secret";
import { handoverSeat } from "@/db/games/actions/handover-seat";

const REAL_PAIR = {
  player1: { firstName: "Real", lastName: "One" },
  player2: { firstName: "Real", lastName: "Two" },
};

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
    vi.mocked(handoverSeat).mockResolvedValue({ ok: true });
  });

  it("claims a valid code, rotates the seat secret, marks used, returns the new token", async () => {
    record = {
      code: "ABC234",
      gameId: "g1",
      seat: "A3NS",
      expiresAt: futureIso(),
      used: 0,
      kind: "CHANGE_DEVICE",
    };

    const result = await validateAndClaimSeatTransferCode("abc234");

    expect(result.valid).toBe(true);
    if (!result.valid) throw new Error("expected valid");
    expect(result.gameId).toBe("g1");
    expect(result.seat).toBe("A3NS");
    expect(result.isHandover).toBe(false);
    expect(typeof result.token).toBe("string");
    // The rotated secret is the token handed back to the new device.
    expect(rotateParticipantSecret).toHaveBeenCalledWith(
      "g1",
      "A3NS",
      result.token,
    );
    // No handover engine for a plain transfer.
    expect(handoverSeat).not.toHaveBeenCalled();
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
      kind: "CHANGE_DEVICE",
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
      kind: "CHANGE_DEVICE",
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
      kind: "CHANGE_DEVICE",
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

  describe("handover claim", () => {
    beforeEach(() => {
      record = {
        code: "HAND01",
        gameId: "g1",
        seat: "A3NS",
        expiresAt: futureIso(),
        used: 0,
        kind: "HANDOVER",
      };
    });

    it("runs the handover engine with the new token and does NOT rotate", async () => {
      const result = await validateAndClaimSeatTransferCode("HAND01", REAL_PAIR);

      expect(result.valid).toBe(true);
      if (!result.valid) throw new Error("expected valid");
      expect(result.isHandover).toBe(true);
      // The claiming device's new secret becomes the real pair's secret.
      expect(handoverSeat).toHaveBeenCalledWith("g1", {
        seat: "A3NS",
        realPair: REAL_PAIR,
        secretKey: result.token,
      });
      // The plain rotate path is NOT used for a handover.
      expect(rotateParticipantSecret).not.toHaveBeenCalled();
      expect(updateSet).toHaveBeenCalledWith({ used: 1 });
    });

    it("rejects WITHOUT consuming when the arriving names are missing", async () => {
      const result = await validateAndClaimSeatTransferCode("HAND01");

      expect(result).toEqual({
        valid: false,
        error: "Enter the arriving pair's names to take over this seat.",
      });
      expect(handoverSeat).not.toHaveBeenCalled();
      // Not consumed — the claimer can retry after entering names.
      expect(updateSet).not.toHaveBeenCalled();
    });

    it("surfaces (and consumes) a handover-engine rejection", async () => {
      vi.mocked(handoverSeat).mockResolvedValue({
        ok: false,
        error: "This seat has already had a handover.",
      });

      const result = await validateAndClaimSeatTransferCode("HAND01", REAL_PAIR);

      expect(result).toEqual({
        valid: false,
        error: "This seat has already had a handover.",
      });
      expect(updateSet).toHaveBeenCalledWith({ used: 1 });
    });
  });

  describe("inspectSeatTransferCode", () => {
    it("reports a valid handover code without consuming it", async () => {
      record = {
        code: "HAND01",
        gameId: "g1",
        seat: "A3NS",
        expiresAt: futureIso(),
        used: 0,
        kind: "HANDOVER",
      };

      const result = await inspectSeatTransferCode("hand01");

      expect(result).toEqual({
        valid: true,
        gameId: "g1",
        seat: "A3NS",
        isHandover: true,
      });
      // Inspect NEVER consumes the code.
      expect(updateSet).not.toHaveBeenCalled();
    });

    it("reports a plain transfer code as not a handover", async () => {
      record = {
        code: "PLAIN1",
        gameId: "g1",
        seat: "A3NS",
        expiresAt: futureIso(),
        used: 0,
        kind: "CHANGE_DEVICE",
      };

      const result = await inspectSeatTransferCode("PLAIN1");
      expect(result).toEqual({
        valid: true,
        gameId: "g1",
        seat: "A3NS",
        isHandover: false,
      });
    });

    it("rejects an invalid code", async () => {
      record = null;
      const result = await inspectSeatTransferCode("ZZZZZZ");
      expect(result).toEqual({ valid: false, error: "Invalid code" });
    });
  });
});
