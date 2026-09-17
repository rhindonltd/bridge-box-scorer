import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/system/queries/bridgewebs-credentials", () => ({
  getBridgewebsCredentials: vi.fn(),
}));
vi.mock("@/lib/bridgewebs/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bridgewebs/client")>();
  return { ...actual, fetchEventsForDay: vi.fn() };
});

import { getBridgewebsCredentials } from "@/db/system/queries/bridgewebs-credentials";
import { fetchEventsForDay } from "@/lib/bridgewebs/client";
import * as appHandler from "./route";

describe("/api/games/bridgewebs/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns configured:false with no events when credentials are absent", async () => {
    vi.mocked(getBridgewebsCredentials).mockResolvedValue(null);

    await testApiHandler({
      appHandler,
      url: "/api/games/bridgewebs/events?date=2026-09-17",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { configured: false, events: [] },
        });
        expect(fetchEventsForDay).not.toHaveBeenCalled();
      },
    });
  });

  it("fetches events for the day (converting date to YYYYMMDD) when configured", async () => {
    vi.mocked(getBridgewebsCredentials).mockResolvedValue({
      club: "myclub",
      password: "secret",
    });
    vi.mocked(fetchEventsForDay).mockResolvedValue([
      { id: "1", title: "Duplicate Pairs" },
    ]);

    await testApiHandler({
      appHandler,
      url: "/api/games/bridgewebs/events?date=2026-09-17",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: {
            configured: true,
            events: [{ id: "1", title: "Duplicate Pairs" }],
          },
        });
        expect(fetchEventsForDay).toHaveBeenCalledWith(
          "myclub",
          "secret",
          "20260917",
        );
      },
    });
  });

  it("returns configured:true with empty events when the remote call fails", async () => {
    vi.mocked(getBridgewebsCredentials).mockResolvedValue({
      club: "myclub",
      password: "secret",
    });
    vi.mocked(fetchEventsForDay).mockRejectedValue(new Error("network down"));

    await testApiHandler({
      appHandler,
      url: "/api/games/bridgewebs/events?date=2026-09-17",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { configured: true, events: [] },
        });
      },
    });
  });

  it("returns 400 for a missing/invalid date", async () => {
    await testApiHandler({
      appHandler,
      url: "/api/games/bridgewebs/events",
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        expect(res.status).toBe(400);
      },
    });
  });
});
