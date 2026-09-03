import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/find-pairs", () => ({ findPairs: vi.fn() }));

import { getDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/participants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns the seated pairs", async () => {
    vi.mocked(findPairs).mockResolvedValue([
      { initialSeat: "A1NS" },
    ] as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { pairs: [{ initialSeat: "A1NS" }] },
        });
      },
    });
  });

  it("returns 404 when the game is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    await testApiHandler({
      appHandler,
      params: { gameId: "ghost" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(404);
        expect(findPairs).not.toHaveBeenCalled();
      },
    });
  });
});
