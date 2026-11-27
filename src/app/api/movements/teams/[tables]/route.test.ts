import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/modules/movement-catalog/server", () => ({
  listTeamMovements: vi.fn(),
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

import { listTeamMovements } from "@/modules/movement-catalog/server";
import * as appHandler from "./route";

describe("GET /api/movements/teams/[tables]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the teams movements for a team count", async () => {
    vi.mocked(listTeamMovements).mockResolvedValue([
      { id: 3, name: "Stagger" },
    ] as never);
    await testApiHandler({
      appHandler,
      params: { tables: "6" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(listTeamMovements).toHaveBeenCalledWith(6);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: [{ id: 3, name: "Stagger" }],
        });
      },
    });
  });

  it("returns 400 for an invalid team count", async () => {
    await testApiHandler({
      appHandler,
      params: { tables: "x" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(400);
        expect(listTeamMovements).not.toHaveBeenCalled();
      },
    });
  });
});
