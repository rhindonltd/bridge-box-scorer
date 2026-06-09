import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

import * as appHandler from "./route";

vi.mock("@/db/system/queries/login-sessions", () => ({
  verifyDirectorPassword: vi.fn(),
}));

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { verifyDirectorPassword } from "@/db/system/queries/login-sessions";
import { createLoginSession } from "@/db/system/actions/create-login-session";

describe("POST /api/director/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(global.crypto, "randomUUID").mockReturnValue("mock-token-123");
  });

  it("returns 401 for invalid password", async () => {
    vi.mocked(verifyDirectorPassword).mockResolvedValue(false);

    await testApiHandler({
      appHandler,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "POST",
          body: JSON.stringify({
            password: "bad-password",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        expect(response.status).toBe(401);

        expect(await response.json()).toEqual({
          success: false,
        });

        expect(createLoginSession).not.toHaveBeenCalled();
      },
    });
  });

  it("creates login session and sets cookie", async () => {
    vi.mocked(verifyDirectorPassword).mockResolvedValue(true);

    await testApiHandler({
      appHandler,

      test: async ({ fetch }) => {
        const response = await fetch({
          method: "POST",
          body: JSON.stringify({
            password: "correct-password",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        expect(response.status).toBe(200);

        expect(await response.json()).toEqual({
          success: true,
          token: "mock-token-123",
        });

        expect(createLoginSession).toHaveBeenCalledWith({
          token: "mock-token-123",
          gameId: null,
          role: "DIRECTOR",
        });

        const setCookie = response.headers.get("set-cookie");

        expect(setCookie).toContain("directorToken=mock-token-123");
        expect(setCookie).toContain("HttpOnly");
        expect(setCookie).toContain("SameSite=Lax");
      },
    });
  });
});
