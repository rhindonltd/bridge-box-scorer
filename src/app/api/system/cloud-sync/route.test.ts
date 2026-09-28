import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});
vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  childLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { validateAdminToken } from "@/db/system/queries/admin-key";
import { POST } from "./route";

function req(token: string | null) {
  const headers = new Headers();
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/cloud-sync", {
    method: "POST",
    headers,
  }) as never;
}

describe("POST /api/system/cloud-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("triggers the sudo helper for an authorised admin", async () => {
    const res = await POST(req("tok"));
    expect(res.status).toBe(200);
    expect(execFile).toHaveBeenCalledWith(
      "sudo",
      ["-n", "/usr/local/bridgebox/bin/cloud-sync-now.sh"],
      expect.any(Function),
    );
    await expect(res.json()).resolves.toMatchObject({ success: true });
  });

  it("returns 401 without triggering the helper for an invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req(null));
    expect(res.status).toBe(401);
    expect(execFile).not.toHaveBeenCalled();
  });
});
