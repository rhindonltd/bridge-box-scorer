import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/services/movement-service", () => ({
  getMovementWithProgress: vi.fn(),
}));

import { getDb } from "@/db/games";
import { getMovementWithProgress } from "@/services/movement-service";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/movement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(getMovementWithProgress).mockResolvedValue({
      type: "PAIRS",
      tables: [],
    } as never);
  });

  it("forwards the section query param to the service", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      url: "/api/games/g1/movement?section=B",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(getMovementWithProgress).toHaveBeenCalledWith(
          expect.anything(),
          "B",
        );
      },
    });
  });

  it("passes undefined when no section is given", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      url: "/api/games/g1/movement",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        expect(getMovementWithProgress).toHaveBeenCalledWith(
          expect.anything(),
          undefined,
        );
      },
    });
  });
});
