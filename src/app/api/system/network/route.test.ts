import { describe, it, expect, vi, beforeEach } from "vitest";

const { exec, existsSync, readFileSync } = vi.hoisted(() => ({
  exec: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, exec, default: { ...actual, exec } };
});
vi.mock("fs", async (importActual) => {
  const actual = await importActual<typeof import("fs")>();
  return {
    ...actual,
    existsSync,
    readFileSync,
    default: { ...actual, existsSync, readFileSync },
  };
});

import { exec as mockExec } from "child_process";
import { GET } from "./route";

function mockExecStdout(stdout: string) {
  vi.mocked(mockExec).mockImplementation(((_cmd: string, cb: unknown) => {
    (cb as (e: unknown, r: { stdout: string; stderr: string }) => void)(null, {
      stdout,
      stderr: "",
    });
  }) as never);
}

const req = () =>
  new Request("http://localhost/api/system/network", {
    method: "GET",
  }) as never;

describe("GET /api/system/network", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports the active SSID and saved config", async () => {
    // nmcli's egrep output for the active line, without a trailing newline
    // (the route does not trim, so a trailing "\n" would leak into the SSID).
    mockExecStdout("yes:HomeNet");
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({ ssid: "SavedNet" }));

    const res = await GET(req());
    const body = await res.json();

    expect(body).toEqual({
      success: true,
      result: {
        wifi: { connected: true, currentSSID: "HomeNet", savedSSID: "SavedNet" },
      },
    });
  });

  it("reports disconnected with no saved config", async () => {
    mockExecStdout("");
    existsSync.mockReturnValue(false);

    const res = await GET(req());
    const body = await res.json();

    expect(body.result.wifi).toEqual({
      connected: false,
      currentSSID: null,
      savedSSID: null,
    });
  });
});
