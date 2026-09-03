import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/board-service", () => ({ getBoardInstances: vi.fn() }));

import { getDb } from "@/db/games";
import { getBoardInstances } from "@/services/board-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/boards/[boardNumber]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns board instances for a valid board number", async () => {
    vi.mocked(getBoardInstances).mockResolvedValue([{ table: 1 }] as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1", boardNumber: "3" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(getBoardInstances).toHaveBeenCalledWith({ marker: "db" }, 3);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { instances: [{ table: 1 }] },
        });
      },
    });
  });

  it("returns 400 for an invalid board number", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1", boardNumber: "abc" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(400);
        expect(getBoardInstances).not.toHaveBeenCalled();
      },
    });
  });
});
