import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/admin-key", () => ({
  validateAdminToken: vi.fn(),
  setAdminKey: vi.fn(),
}));

import { validateAdminToken, setAdminKey } from "@/db/system/queries/admin-key";
import { POST } from "./route";

function req(body: unknown, token: string | null = "tok") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/admin-key", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/system/admin-key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("updates the admin key for a valid key + token", async () => {
    const res = await POST(req({ key: "supersecret" }));
    expect(res.status).toBe(200);
    expect(setAdminKey).toHaveBeenCalledWith("supersecret");
  });

  it("returns 400 when the key is too short", async () => {
    const res = await POST(req({ key: "abc" }));
    expect(res.status).toBe(400);
    expect(setAdminKey).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid admin token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req({ key: "supersecret" }, null));
    expect(res.status).toBe(401);
    expect(setAdminKey).not.toHaveBeenCalled();
  });
});
