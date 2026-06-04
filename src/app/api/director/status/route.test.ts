import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "./route";

vi.mock("@/db/system/queries/login-sessions", () => ({
  directorPasswordExists: vi.fn(),
}));

import { directorPasswordExists } from "@/db/system/queries/login-sessions";

describe("GET /api/director/password-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns passwordSet=true when password exists", async () => {
    vi.mocked(directorPasswordExists).mockResolvedValue(true);

    await testApiHandler({
      appHandler,
      rejectOnHandlerError: true,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "GET",
        });

        expect(response.status).toBe(200);

        expect(await response.json()).toEqual({
          passwordSet: true,
        });
      },
    });
  });

  it("returns passwordSet=false when password does not exist", async () => {
    vi.mocked(directorPasswordExists).mockResolvedValue(false);

    await testApiHandler({
      appHandler,
      rejectOnHandlerError: true,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "GET",
        });

        expect(response.status).toBe(200);

        expect(await response.json()).toEqual({
          passwordSet: false,
        });
      },
    });
  });

  it("returns 500 when directorPasswordExists throws", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    vi.mocked(directorPasswordExists).mockRejectedValue(
      new Error("Database error"),
    );

    await testApiHandler({
      appHandler,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "GET",
        });

        expect(response.status).toBe(500);

        expect(await response.json()).toEqual({
          success: false,
          error: "Internal server error",
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
      },
    });

    consoleErrorSpy.mockRestore();
  });
});
