import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/movements/queries", () => ({
  getPairMovementSpecsForTables: vi.fn(),
}));

import { getPairMovementSpecsForTables } from "@/db/movements/queries";
import * as appHandler from "./route";

describe("GET /api/movements/pairs/[tables]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns specs for a valid table count", async () => {
    vi.mocked(getPairMovementSpecsForTables).mockResolvedValue([
      { id: 1, name: "Mitchell 8" },
    ] as never);

    await testApiHandler({
      appHandler,
      params: { tables: "8" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(getPairMovementSpecsForTables).toHaveBeenCalledWith(8);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: [{ id: 1, name: "Mitchell 8" }],
        });
      },
    });
  });

  it("returns 400 for an invalid table count", async () => {
    await testApiHandler({
      appHandler,
      params: { tables: "0" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(400);
        expect(getPairMovementSpecsForTables).not.toHaveBeenCalled();
      },
    });
  });

  it("returns 500 when the query throws", async () => {
    vi.mocked(getPairMovementSpecsForTables).mockRejectedValue(
      new Error("db down"),
    );

    await testApiHandler({
      appHandler,
      params: { tables: "8" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(500);
      },
    });
  });
});
