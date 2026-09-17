import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/services/bridgewebs-upload-service", () => ({
  uploadResultsToBridgewebs: vi.fn(),
}));
// Director-gated: control token validation and the per-game db resolution.
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games", () => ({ getDb: vi.fn() }));

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { uploadResultsToBridgewebs } from "@/services/bridgewebs-upload-service";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { getDb } from "@/db/games";
import * as appHandler from "./route";

const DIRECTOR_HEADERS = { "x-director-token": "dir-tok" };
const params = { gameId: "g1" };

describe("/api/games/[gameId]/bridgewebs/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "g1",
      eventName: "Monday Pairs",
    } as never);
  });

  it("returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST" });
        expect(res.status).toBe(401);
        expect(uploadResultsToBridgewebs).not.toHaveBeenCalled();
      },
    });
  });

  it("returns the parsed success message from BridgeWebs", async () => {
    vi.mocked(uploadResultsToBridgewebs).mockResolvedValue({
      status: "sent",
      reply: {
        ok: true,
        message: "Upload Successful",
        json: null,
        raw: "message = Upload Successful",
      },
    });

    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST", headers: DIRECTOR_HEADERS });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { ok: true, message: "Upload Successful" },
        });
      },
    });
  });

  it("passes a BridgeWebs error message through (still 200)", async () => {
    vi.mocked(uploadResultsToBridgewebs).mockResolvedValue({
      status: "sent",
      reply: {
        ok: false,
        message: "Invalid password",
        json: null,
        raw: "message = Invalid password",
      },
    });

    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST", headers: DIRECTOR_HEADERS });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { ok: false, message: "Invalid password" },
        });
      },
    });
  });

  it("returns 400 when club info is not configured", async () => {
    vi.mocked(uploadResultsToBridgewebs).mockResolvedValue({
      status: "blocked",
      reason: "club",
    });

    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST", headers: DIRECTOR_HEADERS });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/Club info/);
      },
    });
  });

  it("returns 400 when BridgeWebs credentials are not configured", async () => {
    vi.mocked(uploadResultsToBridgewebs).mockResolvedValue({
      status: "blocked",
      reason: "credentials",
    });

    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST", headers: DIRECTOR_HEADERS });
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/BridgeWebs is not configured/);
      },
    });
  });

  it("returns 502 on a transport failure", async () => {
    vi.mocked(uploadResultsToBridgewebs).mockRejectedValue(
      new Error("network down"),
    );

    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "POST", headers: DIRECTOR_HEADERS });
        expect(res.status).toBe(502);
      },
    });
  });
});
