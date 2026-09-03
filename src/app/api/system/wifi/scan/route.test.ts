import { describe, it, expect, vi, beforeEach } from "vitest";

// exec is consumed via promisify(exec); make the mock invoke the node-style
// callback so the promisified form resolves/rejects as expected.
const { exec } = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock("child_process", async (importActual) => {
  const actual = await importActual<typeof import("child_process")>();
  return { ...actual, exec, default: { ...actual, exec } };
});

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

  it("parses nmcli output into a deduplicated ssid list", async () => {
    mockExecStdout(
      ["HomeNet:WPA2:80", "HomeNet:WPA2:70", "Cafe:--:55", ":WPA2:40"].join(
        "\n",
      ),
    );

    const res = await POST(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    const ssids = body.result.ssids.map((s: { ssid: string }) => s.ssid);
    // Duplicate HomeNet collapsed; blank ssid filtered out.
    expect(ssids).toContain("HomeNet");
    expect(ssids).toContain("Cafe");
    expect(ssids).not.toContain("");
    expect(ssids.filter((s: string) => s === "HomeNet")).toHaveLength(1);
  });
});
