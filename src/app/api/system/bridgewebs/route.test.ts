import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/system/queries/bridgewebs-credentials", () => ({
  getBridgewebsStatus: vi.fn(),
}));
vi.mock("@/db/system/actions/save-bridgewebs-credentials", () => ({
  saveBridgewebsCredentials: vi.fn(),
  saveBridgewebsClub: vi.fn(),
}));
vi.mock("@/db/system/queries/admin-key", () => ({
  validateAdminToken: vi.fn(),
}));

import { getBridgewebsStatus } from "@/db/system/queries/bridgewebs-credentials";
import {
  saveBridgewebsCredentials,
  saveBridgewebsClub,
} from "@/db/system/actions/save-bridgewebs-credentials";
import { validateAdminToken } from "@/db/system/queries/admin-key";
import * as appHandler from "./route";

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-admin-token": "admin-tok",
};

describe("/api/system/bridgewebs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("GET returns the configuration status without a password", async () => {
    vi.mocked(getBridgewebsStatus).mockResolvedValue({
      configured: true,
      club: "myclub",
    });

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const body = await res.json();
        expect(body).toEqual({
          success: true,
          result: { configured: true, club: "myclub" },
        });
        expect(JSON.stringify(body)).not.toContain("password");
      },
    });
  });

  it("POST saves club + password when both are given", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ club: "myclub", password: "secret" }),
          headers: ADMIN_HEADERS,
        });
        expect(res.status).toBe(200);
        expect(saveBridgewebsCredentials).toHaveBeenCalledWith(
          "myclub",
          "secret",
        );
        expect(saveBridgewebsClub).not.toHaveBeenCalled();
      },
    });
  });

  it("POST with a blank password updates only the club code", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ club: "myclub", password: "" }),
          headers: ADMIN_HEADERS,
        });
        expect(res.status).toBe(200);
        expect(saveBridgewebsClub).toHaveBeenCalledWith("myclub");
        expect(saveBridgewebsCredentials).not.toHaveBeenCalled();
      },
    });
  });

  it("POST returns 400 for a missing club", async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ password: "secret" }),
          headers: ADMIN_HEADERS,
        });
        expect(res.status).toBe(400);
        expect(saveBridgewebsCredentials).not.toHaveBeenCalled();
        expect(saveBridgewebsClub).not.toHaveBeenCalled();
      },
    });
  });

  it("POST returns 401 without a valid admin token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: "POST",
          body: JSON.stringify({ club: "myclub", password: "secret" }),
          headers: { "content-type": "application/json" },
        });
        expect(res.status).toBe(401);
        expect(saveBridgewebsCredentials).not.toHaveBeenCalled();
      },
    });
  });
});
