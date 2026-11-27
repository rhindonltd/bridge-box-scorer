import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/modules/movement-catalog/server", () => ({
  getTeamMovementDetail: vi.fn(),
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

import { getTeamMovementDetail } from "@/modules/movement-catalog/server";
import * as appHandler from "./route";

describe("GET /api/movements/teams/detail/[movementId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a teams movement's layout", async () => {
    vi.mocked(getTeamMovementDetail).mockResolvedValue({
      name: "Stagger",
      tables: [],
    });
    await testApiHandler({
      appHandler,
      params: { movementId: "3" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(getTeamMovementDetail).toHaveBeenCalledWith(3);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { name: "Stagger", tables: [] },
        });
      },
    });
  });

  it("returns 400 for an invalid id", async () => {
    await testApiHandler({
      appHandler,
      params: { movementId: "1.5" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(400);
      },
    });
  });

  it("returns 404 when no supported teams movement has the id", async () => {
    vi.mocked(getTeamMovementDetail).mockResolvedValue(null);
    await testApiHandler({
      appHandler,
      params: { movementId: "9" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(404);
      },
    });
  });
});
