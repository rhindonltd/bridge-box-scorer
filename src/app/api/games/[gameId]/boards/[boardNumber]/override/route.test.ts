import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

const set = vi.fn(() => ({ where: vi.fn() }));
const update = vi.fn(() => ({ set }));

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/tables/boards", () => ({
  boards: {
    roundNumber: "round_number",
    tableNumber: "table_number",
    boardNumber: "board_number",
  },
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import * as appHandler from "./route";

const validBody = {
  directorToken: "tok",
  roundNumber: 1,
  tableNumber: 2,
  result: "3NTN=",
};

describe("POST /api/games/[gameId]/boards/[boardNumber]/override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ update } as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("applies the override for an authorised director", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1", boardNumber: "5" },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify(validBody),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        expect(update).toHaveBeenCalled();
        expect(set).toHaveBeenCalledWith(
          expect.objectContaining({ status: "OVERRIDDEN", directorOverrideResult: "3NTN=" }),
        );
      },
    });
  });

  it("returns 400 for an invalid override body", async () => {
    await testApiHandler({
      appHandler,
      params: { gameId: "g1", boardNumber: "5" },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ directorToken: "tok", roundNumber: 1 }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(400);
        expect(update).not.toHaveBeenCalled();
      },
    });
  });

  it("returns 401 for an invalid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1", boardNumber: "5" },
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify(validBody),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(401);
        expect(update).not.toHaveBeenCalled();
      },
    });
  });
});
