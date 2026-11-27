import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/modules/movement-catalog/storage/db/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
}));
vi.mock(
  "@/modules/movement-catalog/storage/db/queries/get-movement-spec",
  () => ({
    getPairMovementSpecById: vi.fn(),
  }),
);
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  childLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { getPairMovement } from "@/modules/movement-catalog/storage/db/queries/get-movement";
import { getPairMovementSpecById } from "@/modules/movement-catalog/storage/db/queries/get-movement-spec";
import * as appHandler from "./route";

describe("GET /api/movements/detail/[movementId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a stored movement's detail with computed board ranges", async () => {
    vi.mocked(getPairMovementSpecById).mockResolvedValue({
      id: 1,
      name: "3 Table Howell",
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
      params: { movementId: "1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.result.name).toBe("3 Table Howell");
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
      params: { movementId: "abc" },
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
      params: { movementId: "99" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(404);
      },
    });
  });

  it("returns 500 when a query rejects", async () => {
    vi.mocked(getPairMovementSpecById).mockRejectedValue(new Error("boom"));
    vi.mocked(getPairMovement).mockResolvedValue([] as never);

    await testApiHandler({
      appHandler,
      params: { movementId: "1" },
      test: async ({ fetch }) => {
        expect((await fetch({ method: "GET" })).status).toBe(500);
      },
    });
  });

});
