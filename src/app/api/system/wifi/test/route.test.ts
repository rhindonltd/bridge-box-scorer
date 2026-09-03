import { describe, it, expect, vi, beforeEach } from "vitest";

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});
vi.mock("@/db/system/queries/admin-key", () => ({ validateAdminToken: vi.fn() }));

import { execFile as mockExecFile } from "child_process";
import { validateAdminToken } from "@/db/system/queries/admin-key";
import { POST } from "./route";

/**
 * The route uses promisify(execFile). Drive the node-style callback: resolve
 * for every nmcli call unless the args match a "reject" predicate.
 */
function setExec(shouldReject: (args: string[]) => boolean) {
  vi.mocked(mockExecFile).mockImplementation(((
    _cmd: string,
    args: string[],
    cb: unknown,
  ) => {
    const callback = cb as (e: unknown, r?: unknown) => void;
    if (shouldReject(args)) {
      callback(new Error("nmcli failed"));
    } else {
      callback(null, { stdout: "", stderr: "" });
    }
  }) as never);
}

function req(body: unknown, token: string | null = "tok") {
  const headers = new Headers({ "content-type": "application/json" });
  if (token) headers.set("x-admin-token", token);
  return new Request("http://localhost/api/system/wifi/test", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/system/wifi/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateAdminToken).mockResolvedValue(true);
  });

  it("returns connected:true when the profile comes up, and tears it down", async () => {
    setExec(() => false); // everything succeeds

    const res = await POST(req({ ssid: "HomeNet", password: "secret" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { connected: true },
    });

    // Cleanup: the throwaway test profile is deleted (at least once).
    const calls = vi.mocked(mockExecFile).mock.calls as unknown[][];
    const deleteCalls = calls.filter((c) =>
      (c[1] as string[]).includes("delete"),
    );
    expect(deleteCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("returns success:false (200) when bringing the profile up fails", async () => {
    setExec((args) => args.includes("up"));

    const res = await POST(req({ ssid: "HomeNet", password: "wrong" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Failed to connect to the network",
    });
  });

  it("returns 400 for an invalid body", async () => {
    setExec(() => false);
    const res = await POST(req({ password: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 for an invalid token", async () => {
    vi.mocked(validateAdminToken).mockResolvedValue(false);
    const res = await POST(req({ ssid: "x", password: "y" }, null));
    expect(res.status).toBe(401);
    expect(mockExecFile).not.toHaveBeenCalled();
  });
});
