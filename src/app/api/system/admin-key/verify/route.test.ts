import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/system/queries/admin-key", () => ({ verifyAdminKey: vi.fn() }));
vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { verifyAdminKey } from "@/db/system/queries/admin-key";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import * as appHandler from "./route";

describe("POST /api/system/admin-key/verify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mints an ADMIN session token for a correct key", async () => {
    vi.mocked(verifyAdminKey).mockResolvedValue(true);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ key: "correct" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(typeof body.result.adminToken).toBe("string");
        expect(createLoginSession).toHaveBeenCalledWith(
          expect.objectContaining({ role: "ADMIN", gameId: null }),
        );
      },
    });
  });

  it("returns 401 for an incorrect key without minting a session", async () => {
    vi.mocked(verifyAdminKey).mockResolvedValue(false);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ key: "wrong" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(401);
        expect(createLoginSession).not.toHaveBeenCalled();
      },
    });
  });

  it("returns 400 for a missing key", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(400);
      },
    });
  });
});
