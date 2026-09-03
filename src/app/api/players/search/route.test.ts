import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/players/queries/find-player", () => ({ findPlayer: vi.fn() }));

import { findPlayer } from "@/db/players/queries/find-player";
import * as appHandler from "./route";

describe("GET /api/players/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty list for an empty query without hitting the db", async () => {
    await testApiHandler({
      appHandler,
      url: "/api/players/search",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: [],
        });
        expect(findPlayer).not.toHaveBeenCalled();
      },
    });
  });

  it("returns an empty list for a non-numeric query", async () => {
    await testApiHandler({
      appHandler,
      url: "/api/players/search?q=alice",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: [],
        });
        expect(findPlayer).not.toHaveBeenCalled();
      },
    });
  });

  it("maps EBU player rows to NewPlayer shape for a numeric query", async () => {
    vi.mocked(findPlayer).mockResolvedValue([
      { ebuNumber: 123, firstName: "Alice", lastName: "Adams" },
    ] as never);

    await testApiHandler({
      appHandler,
      url: "/api/players/search?q=123",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(findPlayer).toHaveBeenCalledWith(123);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: [
            { firstName: "Alice", lastName: "Adams", nationalId: "123" },
          ],
        });
      },
    });
  });
});
