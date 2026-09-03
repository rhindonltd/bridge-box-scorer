import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
  getTeamMovement: vi.fn(),
}));
vi.mock("@/db/movements/queries/get-movement-spec", () => ({
  getPairMovementSpecById: vi.fn(),
  getTeamMovementSpecById: vi.fn(),
}));

import { getPairMovement } from "@/db/movements/queries/get-movement";
import { getPairMovementSpecById } from "@/db/movements/queries/get-movement-spec";
import * as appHandler from "./route";

describe("GET /api/movements/detail/[movementType]/[movementId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns PAIRS movement detail with computed board ranges", async () => {
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      id: 1,
      boardsPerRound: 2,
    } as never);
    vi.mocked(getPairMovement).mockResolvedValue([
      {
        tableNumber: 1,
        rounds: [{ roundNumber: 1, ns: "1", ew: "2", boardSet: 1 }],
      },
    ] as never);

    await testApiHandler({
      appHandler,
      params: { movementType: "PAIRS", movementId: "1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.result.type).toBe("PAIRS");
        expect(body.result.tables[0].tableNumber).toBe(1);
        expect(body.result.tables[0].rounds[0]).toMatchObject({
          roundNumber: 1,
          ns: "1",
          ew: "2",
        });
      },
    });
  });

  it("returns 400 for an invalid movement id", async () => {
    await testApiHandler({
      appHandler,
      params: { movementType: "PAIRS", movementId: "abc" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(400);
      },
    });
  });

  it("returns 404 when the spec is missing", async () => {
    vi.mocked(getPairMovementSpecById).mockResolvedValue(null as never);
    vi.mocked(getPairMovement).mockResolvedValue([] as never);

    await testApiHandler({
      appHandler,
      params: { movementType: "PAIRS", movementId: "99" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(404);
      },
    });
  });

  it("returns 400 for an unknown movement type", async () => {
    await testApiHandler({
      appHandler,
      params: { movementType: "SOLO", movementId: "1" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(400);
      },
    });
  });
});
