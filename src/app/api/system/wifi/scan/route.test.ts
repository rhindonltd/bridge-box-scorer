import { describe, it, expect, vi, beforeEach } from "vitest";

// execFile is consumed via promisify(execFile); make the mock invoke the
// node-style callback so the promisified form resolves/rejects as expected.
const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, execFile, default: { ...actual, execFile } };
});

// The route first checks WiFi-management availability; control it per-test.
const { isWifiManagementAvailable } = vi.hoisted(() => ({
  isWifiManagementAvailable: vi.fn(),
}));
vi.mock("@/lib/system/wifi-availability", () => ({ isWifiManagementAvailable }));

// Control the appliance's own AP SSID (excluded from results) per-test.
const { getOwnApSsid } = vi.hoisted(() => ({ getOwnApSsid: vi.fn() }));
vi.mock("@/lib/system/wifi-ap", () => ({ getOwnApSsid }));

import { execFile as mockExecFile } from "child_process";
import { POST } from "./route";

type ExecCallback = (e: unknown, r?: { stdout: string; stderr: string }) => void;

/** Resolve every execFile call with the given stdout. */
function mockScanStdout(stdout: string) {
  vi.mocked(mockExecFile).mockImplementation(((
    _cmd: string,
    _args: string[],
    cb: unknown,
  ) => {
    (cb as ExecCallback)(null, { stdout, stderr: "" });
  }) as never);
}

const req = () =>
  new Request("http://localhost/api/system/wifi/scan", {
    method: "POST",
  }) as never;

describe("POST /api/system/wifi/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOwnApSsid).mockResolvedValue(null);
  });

  it("forces a fresh scan (--rescan yes) and parses the ssid list", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
    mockScanStdout(
      ["HomeNet:WPA2:80", "HomeNet:WPA2:70", "Cafe:--:55", ":WPA2:40"].join(
        "\n",
      ),
    );

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.available).toBe(true);
    const ssids = body.result.ssids.map((s: { ssid: string }) => s.ssid);
    expect(ssids).toContain("HomeNet");
    expect(ssids).toContain("Cafe");
    expect(ssids).not.toContain("");
    expect(ssids.filter((s: string) => s === "HomeNet")).toHaveLength(1);

    // The scan is a forced active rescan.
    const scanArgs = vi.mocked(mockExecFile).mock.calls[0][1] as string[];
    expect(scanArgs).toContain("--rescan");
    expect(scanArgs[scanArgs.indexOf("--rescan") + 1]).toBe("yes");
  });

  it("excludes the appliance's own AP SSID from the results", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);
    vi.mocked(getOwnApSsid).mockResolvedValue("BridgeBox");
    mockScanStdout(
      ["BridgeBox:WPA2:99", "HomeNet:WPA2:80", "Cafe:--:55"].join("\n"),
    );

    const res = await POST(req());
    const body = await res.json();

    const ssids = body.result.ssids.map((s: { ssid: string }) => s.ssid);
    expect(ssids).not.toContain("BridgeBox");
    expect(ssids).toEqual(["HomeNet", "Cafe"]);
  });

  it("retries the scan once when the radio is transiently busy", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(true);

    let call = 0;
    vi.mocked(mockExecFile).mockImplementation(((
      _cmd: string,
      _args: string[],
      cb: unknown,
    ) => {
      call += 1;
      if (call === 1) {
        (cb as ExecCallback)(new Error("Device or resource busy"));
      } else {
        (cb as ExecCallback)(null, { stdout: "HomeNet:WPA2:80", stderr: "" });
      }
    }) as never);

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.ssids.map((s: { ssid: string }) => s.ssid)).toEqual([
      "HomeNet",
    ]);
    // First (failed) scan + retry = at least two scan invocations.
    expect(vi.mocked(mockExecFile).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("reports available:false with no ssids when WiFi management is absent", async () => {
    vi.mocked(isWifiManagementAvailable).mockResolvedValue(false);

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.available).toBe(false);
    expect(body.result.ssids).toEqual([]);
    // nmcli is never invoked when management is unavailable.
    expect(mockExecFile).not.toHaveBeenCalled();
  });
});
