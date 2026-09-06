import { describe, it, expect, vi, beforeEach } from "vitest";

// exec is consumed via promisify(exec); make the mock invoke the node-style
// callback so the promisified form resolves/rejects as expected.
const { exec } = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, exec, default: { ...actual, exec } };
});

// The route first checks WiFi-management availability; control it per-test.
const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

import { exec as mockExec } from "child_process";
import { POST } from "./route";

function mockExecStdout(stdout: string) {
  vi.mocked(mockExec).mockImplementation(((_cmd: string, cb: unknown) => {
    (cb as (e: unknown, r: { stdout: string; stderr: string }) => void)(null, {
      stdout,
      stderr: "",
    });
  }) as never);
}

const req = () =>
  new Request("http://localhost/api/system/wifi/scan", {
    method: "POST",
  }) as never;

describe("POST /api/system/wifi/scan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses nmcli output into a deduplicated ssid list when available", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
    mockExecStdout(
      ["HomeNet:WPA2:80", "HomeNet:WPA2:70", "Cafe:--:55", ":WPA2:40"].join(
        "\n",
      ),
    );

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.available).toBe(true);
    const ssids = body.result.ssids.map((s: { ssid: string }) => s.ssid);
    // Duplicate HomeNet collapsed; blank ssid filtered out.
    expect(ssids).toContain("HomeNet");
    expect(ssids).toContain("Cafe");
    expect(ssids).not.toContain("");
    expect(ssids.filter((s: string) => s === "HomeNet")).toHaveLength(1);
  });

  it("reports available:false with no ssids when WiFi management is absent", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.available).toBe(false);
    expect(body.result.ssids).toEqual([]);
    // nmcli is never invoked when management is unavailable.
    expect(mockExec).not.toHaveBeenCalled();
  });
});
