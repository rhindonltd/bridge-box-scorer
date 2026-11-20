import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/db/system/queries/validate-share-code", () => ({
  validateAndClaimShareCode: vi.fn(),
}));
vi.mock("@/db/system/queries/admin-key", () => ({
  verifyAdminKey: vi.fn(),
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));
vi.mock("@/services/security/sign-in-guard", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  blockedResponse: vi.fn(() => null),
  signInFailed: vi.fn(),
  signInSucceeded: vi.fn(async () => undefined),
}));
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  childLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { validateAndClaimShareCode } from "@/db/system/queries/validate-share-code";
import { verifyAdminKey } from "@/db/system/queries/admin-key";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import {
  blockedResponse,
  signInFailed,
  signInSucceeded,
} from "@/services/security/sign-in-guard";
import { NOT_SHARE_CODE_OR_ADMIN_KEY } from "@/lib/director-claim-messages";
import { POST } from "./route";

function invoke(body: unknown) {
  const req = new Request("http://localhost/api/director-codes/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as never);
}

const seats = [{ gameId: "g1", seat: "A3NS", token: "t" }];

describe("POST /api/director-codes/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminKey).mockResolvedValue(false);
  });

  describe("with a share code", () => {
    it("claims it, mints a session, and tells the other directors", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: true,
        gameId: "g1",
      });
      const res = await invoke({
        code: "K7M2PX",
        gameId: "g1",
        seats,
        originId: "origin-1",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result).toEqual({
        directorToken: expect.any(String),
        gameId: "g1",
      });
      expect(validateAndClaimShareCode).toHaveBeenCalledWith("K7M2PX");
      expect(createLoginSession).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: "g1", role: "DIRECTOR" }),
      );
      expect(signInSucceeded).toHaveBeenCalledWith(
        expect.any(Request),
        { kind: "game", gameId: "g1" },
        "shareCode",
        seats,
        "origin-1",
      );
    });

    it("grants the game the share code names", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: true,
        gameId: "other",
      });
      const res = await invoke({ code: "K7M2PX", gameId: "g1" });
      expect((await res.json()).result.gameId).toBe("other");
    });

    it("keeps a share code's own reason (e.g. expired) and counts the failure", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false,
        error: "Code has expired",
      });
      const res = await invoke({ code: "OLDCOD", gameId: "g1", seats });
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        success: false,
        error: "Code has expired",
      });
      expect(signInFailed).toHaveBeenCalledWith(
        expect.any(Request),
        { kind: "game", gameId: "g1" },
        seats,
      );
      expect(createLoginSession).not.toHaveBeenCalled();
    });

    it("says an unknown code is neither a share code nor the admin key", async () => {
      vi.mocked(validateAndClaimShareCode).mockResolvedValue({
        valid: false,
        error: "Invalid code",
      });
      const res = await invoke({ code: "WRONG1", gameId: "g1" });
      await expect(res.json()).resolves.toEqual({
        success: false,
        error: NOT_SHARE_CODE_OR_ADMIN_KEY,
      });
    });
  });

  describe("with the admin key", () => {
    it("makes the caller a director of the requested game", async () => {
      vi.mocked(verifyAdminKey).mockResolvedValue(true);
      vi.mocked(findGameById).mockResolvedValue({ gameId: "g9" } as never);
      const res = await invoke({ code: "Admin-Key", gameId: "g9" });
      expect(res.status).toBe(200);
      expect((await res.json()).result.gameId).toBe("g9");
      // The key is checked exactly as typed (it may be mixed case).
      expect(verifyAdminKey).toHaveBeenCalledWith("Admin-Key");
      expect(validateAndClaimShareCode).not.toHaveBeenCalled();
      expect(signInSucceeded).toHaveBeenCalledWith(
        expect.any(Request),
        { kind: "game", gameId: "g9" },
        "adminKey",
        undefined,
        undefined,
      );
    });

    it("rejects a game that doesn't exist", async () => {
      vi.mocked(verifyAdminKey).mockResolvedValue(true);
      vi.mocked(findGameById).mockResolvedValue(null as never);
      const res = await invoke({ code: "ADMINKEY", gameId: "gone" });
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        success: false,
        error: "Game not found",
      });
      expect(createLoginSession).not.toHaveBeenCalled();
    });
  });

  it("refuses a blocked device before checking the code", async () => {
    vi.mocked(blockedResponse).mockReturnValueOnce(
      NextResponse.json({ success: false, error: "Too many" }, { status: 429 }),
    );
    const res = await invoke({ code: "K7M2PX", gameId: "g1" });
    expect(res.status).toBe(429);
    expect(validateAndClaimShareCode).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid payload (missing code or game)", async () => {
    expect((await invoke({})).status).toBe(400);
    expect((await invoke({ code: "K7M2PX" })).status).toBe(400);
    expect(signInFailed).not.toHaveBeenCalled();
  });

  it("returns 500, without counting a failure, when the lookup breaks", async () => {
    vi.mocked(validateAndClaimShareCode).mockRejectedValue(new Error("db"));
    const res = await invoke({ code: "K7M2PX", gameId: "g1" });
    expect(res.status).toBe(500);
    expect(signInFailed).not.toHaveBeenCalled();
  });
});
