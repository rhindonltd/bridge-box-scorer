import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/schedule-service", () => ({ getSchedule: vi.fn() }));

import { getDb } from "@/db/games";
import { getSchedule } from "@/services/schedule-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/schedule/[seat]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns the schedule for a seat", async () => {
    vi.mocked(getSchedule).mockResolvedValue({ rounds: [] } as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1", seat: "A1NS" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(getSchedule).toHaveBeenCalledWith({ marker: "db" }, "A1NS");
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { rounds: [] },
        });
      },
    });
  });

  it("returns 404 when there is no schedule for the seat", async () => {
    vi.mocked(getSchedule).mockResolvedValue(null as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1", seat: "Z9NS" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(404);
      },
    });
  });
});
