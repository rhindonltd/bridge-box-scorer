import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn(),
}));
vi.mock("@/services/ebu-upload-service", () => ({
  uploadResultsToEbu: vi.fn(),
}));
vi.mock("@/services/security/director-token", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games", () => ({ getDb: vi.fn() }));

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import { uploadResultsToEbu } from "@/services/ebu-upload-service";
import { validateDirectorToken } from "@/services/security/director-token";
import { getDb } from "@/db/games";
import * as appHandler from "./route";

const DIRECTOR_HEADERS = { "x-director-token": "dir-tok" };
const params = { gameId: "g1" };

describe("/api/games/[gameId]/ebu/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(isGameFinalised).mockResolvedValue(true);
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "g1",
      eventName: "Monday Pairs",
      tournamentLevel: "NATIONAL_HEAT",
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
        expect(uploadResultsToEbu).not.toHaveBeenCalled();
      },
    });
  });

  it("returns 403 until the game is finalised", async () => {
    vi.mocked(isGameFinalised).mockResolvedValue(false);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: DIRECTOR_HEADERS,
        });
        expect(res.status).toBe(403);
        expect(uploadResultsToEbu).not.toHaveBeenCalled();
      },
    });
  });

  it("submits using the level saved on the game", async () => {
    vi.mocked(uploadResultsToEbu).mockResolvedValue({
      status: "sent",
      submission: { ok: true, sessionId: "S1", warnings: [] },
      advisories: [],
    } as never);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: DIRECTOR_HEADERS,
        });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
          success: true,
          result: { ok: true, sessionId: "S1" },
        });
        expect(uploadResultsToEbu).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          "NATIONAL_HEAT",
        );
      },
    });
  });

  it("returns 400 when club info is not configured", async () => {
    vi.mocked(uploadResultsToEbu).mockResolvedValue({
      status: "blocked",
      reason: "club",
    } as never);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: DIRECTOR_HEADERS,
        });
        expect(res.status).toBe(400);
      },
    });
  });

  it("returns 502 on a transport failure", async () => {
    vi.mocked(uploadResultsToEbu).mockRejectedValue(new Error("down"));
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          headers: DIRECTOR_HEADERS,
        });
        expect(res.status).toBe(502);
      },
    });
  });
});
