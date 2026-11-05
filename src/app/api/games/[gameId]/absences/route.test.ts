import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/games/queries/find-absent-pairs", () => ({
  findAbsentPairs: vi.fn(),
}));
vi.mock("@/db/games/actions/set-absence-treatment", () => ({
  setAbsenceTreatment: vi.fn(),
}));
vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));
vi.mock("@/socket/websocket", () => ({ getIO: vi.fn(() => null) }));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findAbsentPairs } from "@/db/games/queries/find-absent-pairs";
import { setAbsenceTreatment } from "@/db/games/actions/set-absence-treatment";
import * as appHandler from "./route";

const HEADERS = {
  "x-director-token": "dir",
  "Content-Type": "application/json",
};
const params = { gameId: "g1" };
const absent = {
  seat: "A1NS",
  kind: "WITHDRAWN",
  pair: "A & B",
  round: 3,
  treatment: "AVERAGE",
  missedBoards: 2,
};

describe("/api/games/[gameId]/absences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(findGameById).mockResolvedValue({
      gameType: "PAIRS",
      eventFormat: "STANDARD",
    } as never);
    vi.mocked(findAbsentPairs).mockResolvedValue([absent] as never);
    vi.mocked(setAbsenceTreatment).mockResolvedValue(true);
  });

  it("GET lists the absences for a pairs event", async () => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { absences: [absent] },
        });
      },
    });
  });

  it("GET is empty for a teams event", async () => {
    vi.mocked(findGameById).mockResolvedValue({ gameType: "TEAMS" } as never);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { absences: [] },
        });
        expect(findAbsentPairs).not.toHaveBeenCalled();
      },
    });
  });

  it("PATCH sets the treatment", async () => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A1NS", treatment: "REMOVED" }),
        });
        expect(res.status).toBe(200);
        expect(setAbsenceTreatment).toHaveBeenCalledWith(
          "g1",
          "A1NS",
          "REMOVED",
        );
      },
    });
  });

  it("PATCH 404s for a seat with no absence", async () => {
    vi.mocked(setAbsenceTreatment).mockResolvedValue(false);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A9NS", treatment: "REMOVED" }),
        });
        expect(res.status).toBe(404);
      },
    });
  });

  it("PATCH rejects a bad treatment and a non-director", async () => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const bad = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A1NS", treatment: "PENALISED" }),
        });
        expect(bad.status).toBe(400);
      },
    });
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A1NS", treatment: "REMOVED" }),
        });
        expect(res.status).not.toBe(200);
      },
    });
    expect(setAbsenceTreatment).not.toHaveBeenCalled();
  });
});
