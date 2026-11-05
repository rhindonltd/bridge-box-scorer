import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/games/queries/find-game-roster", () => ({
  findGameRoster: vi.fn(),
}));
vi.mock("@/db/games/actions/record-withdrawal", () => ({
  recordWithdrawal: vi.fn(),
}));
vi.mock("@/services/resolve-play-state", () => ({
  resolvePlayState: vi.fn(),
}));
vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));
vi.mock("@/socket/websocket", () => ({ getIO: vi.fn(() => null) }));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findGameRoster } from "@/db/games/queries/find-game-roster";
import { recordWithdrawal } from "@/db/games/actions/record-withdrawal";
import { resolvePlayState } from "@/services/resolve-play-state";
import * as appHandler from "./route";

const HEADERS = {
  "x-director-token": "dir",
  "Content-Type": "application/json",
};
const params = { gameId: "g1" };
const entry = { seat: "A1NS", pair: "A & B", status: "ACTIVE" };

describe("/api/games/[gameId]/pairs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(findGameById).mockResolvedValue({
      gameType: "PAIRS",
      eventFormat: "STANDARD",
    } as never);
    vi.mocked(findGameRoster).mockResolvedValue([entry] as never);
    vi.mocked(resolvePlayState).mockResolvedValue({
      rounds: [{ roundNumber: 1 }, { roundNumber: 2 }],
      phase: {
        kind: "round",
        roundIndex: 1,
        position: { at: "entering", boardNumber: 3 },
      },
    } as never);
    vi.mocked(recordWithdrawal).mockResolvedValue({
      ok: true,
      absentBoards: 2,
    });
  });

  it("GET returns the roster for a pairs event", async () => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { roster: [entry] },
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
          result: { roster: [] },
        });
        expect(findGameRoster).not.toHaveBeenCalled();
      },
    });
  });

  it("PATCH withdraw resolves the round and calls recordWithdrawal", async () => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A1NS", action: "withdraw" }),
        });
        expect(res.status).toBe(200);
        expect(recordWithdrawal).toHaveBeenCalledWith("g1", "A1NS", 2);
      },
    });
  });

  it("PATCH relays a withdraw rejection as 400", async () => {
    vi.mocked(recordWithdrawal).mockResolvedValue({
      ok: false,
      error: "nothing to play",
    });
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A1NS", action: "withdraw" }),
        });
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toMatchObject({
          error: "nothing to play",
        });
      },
    });
  });

  it("PATCH rejects a non-director and an unknown action", async () => {
    await testApiHandler({
      appHandler,
      params,
      test: async ({ fetch }) => {
        // "reinstate" is no longer a verb here — it goes through a code flow.
        const bad = await fetch({
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({ seat: "A1NS", action: "reinstate" }),
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
          body: JSON.stringify({ seat: "A1NS", action: "withdraw" }),
        });
        expect(res.status).not.toBe(200);
      },
    });
    expect(recordWithdrawal).not.toHaveBeenCalled();
  });
});
