import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/system/queries/ebu-credentials", () => ({
  getEbuStatus: vi.fn(),
}));
vi.mock("@/db/system/actions/save-ebu-credentials", () => ({
  saveEbuCredentials: vi.fn(),
  saveEbuNumber: vi.fn(),
}));
vi.mock("@/db/system/actions/upsert-club", () => ({ upsertClub: vi.fn() }));
// POST is admin-gated; control token validation per-test.
vi.mock("@/db/system/queries/admin-key", () => ({
  validateAdminToken: vi.fn(),
}));

import { getEbuStatus } from "@/db/system/queries/ebu-credentials";
import {
  saveEbuCredentials,
  saveEbuNumber,
} from "@/db/system/actions/save-ebu-credentials";
import { upsertClub } from "@/db/system/actions/upsert-club";
import { validateAdminToken } from "@/db/system/queries/admin-key";
import * as appHandler from "./route";

const ADMIN_HEADERS = {
  "content-type": "application/json",
  "x-admin-token": "admin-tok",
};

async function post(
  body: unknown,
  headers: Record<string, string> = ADMIN_HEADERS,
) {
  let status = 0;
  await testApiHandler({
    appHandler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        body: JSON.stringify(body),
        headers,
      });
      status = res.status;
    },
  });
  return status;
}

describe("/api/system/ebu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("GET returns the EBU status", async () => {
    vi.mocked(getEbuStatus).mockResolvedValue({
      configured: true,
      ebuNumber: "1234",
    });
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        await expect(res.json()).resolves.toEqual({
          success: true,
          result: { configured: true, ebuNumber: "1234" },
        });
      },
    });
  });

  it("saves the club record and the EBU login together", async () => {
    const status = await post({
      clubName: "  Anytown BC ",
      ebuNumber: " 1234 ",
      password: "secret",
    });
    expect(status).toBe(200);
    expect(upsertClub).toHaveBeenCalledWith("Anytown BC", "1234");
    expect(saveEbuCredentials).toHaveBeenCalledWith("1234", "secret");
    expect(saveEbuNumber).not.toHaveBeenCalled();
  });

  it("saves the club record and number without a password (no EBU login needed)", async () => {
    const status = await post({
      clubName: "Anytown BC",
      ebuNumber: "1234",
      password: "",
    });
    expect(status).toBe(200);
    expect(upsertClub).toHaveBeenCalledWith("Anytown BC", "1234");
    expect(saveEbuNumber).toHaveBeenCalledWith("1234");
    expect(saveEbuCredentials).not.toHaveBeenCalled();
  });

  it("leaves the club record alone when no club name is sent", async () => {
    const status = await post({ ebuNumber: "1234", password: "secret" });
    expect(status).toBe(200);
    expect(upsertClub).not.toHaveBeenCalled();
    expect(saveEbuCredentials).toHaveBeenCalledWith("1234", "secret");
  });

  it("rejects a blank club name", async () => {
    const status = await post({
      clubName: "   ",
      ebuNumber: "1234",
      password: "",
    });
    expect(status).toBe(400);
    expect(upsertClub).not.toHaveBeenCalled();
    expect(saveEbuNumber).not.toHaveBeenCalled();
  });

  it("rejects a missing EBU number", async () => {
    const status = await post({ clubName: "Anytown BC", password: "" });
    expect(status).toBe(400);
    expect(upsertClub).not.toHaveBeenCalled();
  });

  it("returns 401 without a valid admin token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const status = await post(
      { clubName: "Anytown BC", ebuNumber: "1234", password: "" },
      { "content-type": "application/json" },
    );
    expect(status).toBe(401);
    expect(upsertClub).not.toHaveBeenCalled();
  });
});
