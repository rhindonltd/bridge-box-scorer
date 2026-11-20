import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/system/queries/admin-key", () => ({ verifyAdminKey: vi.fn() }));
vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));
vi.mock("@/services/security/sign-in-guard", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  blockedResponse: vi.fn(() => null),
  signInFailed: vi.fn(),
  signInSucceeded: vi.fn(async () => undefined),
}));

import { verifyAdminKey } from "@/db/system/queries/admin-key";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import {
  blockedResponse,
  signInFailed,
  signInSucceeded,
} from "@/services/security/sign-in-guard";
import { NextResponse } from "next/server";
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
        // Every director is told.
        expect(signInSucceeded).toHaveBeenCalledWith(
          expect.any(Request),
          { kind: "settings" },
          "adminKey",
          undefined,
          undefined,
        );
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
        expect(signInFailed).toHaveBeenCalledWith(
          expect.any(Request),
          { kind: "settings" },
          undefined,
        );
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

  it("refuses a blocked device before checking the key", async () => {
    vi.mocked(blockedResponse).mockReturnValueOnce(
      NextResponse.json({ success: false, error: "Too many" }, { status: 429 }),
    );
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ key: "correct" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(429);
        expect(verifyAdminKey).not.toHaveBeenCalled();
      },
    });
  });

  it("passes the device's held seats and origin id on", async () => {
    vi.mocked(verifyAdminKey).mockResolvedValue(true);
    const seats = [{ gameId: "g1", seat: "A3NS", token: "t" }];
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        await fetch({
          method: "POST",
          body: JSON.stringify({ key: "correct", seats, originId: "o-1" }),
          headers: { "content-type": "application/json" },
        });
        expect(signInSucceeded).toHaveBeenCalledWith(
          expect.any(Request),
          { kind: "settings" },
          "adminKey",
          seats,
          "o-1",
        );
      },
    });
  });
});
