import { describe, it, expect, vi, beforeEach } from "vitest";

const { readScanResult } = vi.hoisted(() => ({ readScanResult: vi.fn() }));
vi.mock("@/lib/system/wifi-config", () => ({ readScanResult }));

import { GET } from "./route";

const req = () =>
  new Request("http://localhost/api/system/wifi/scan/status", {
    method: "GET",
  }) as never;

describe("GET /api/system/wifi/scan/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no scan has run", async () => {
    vi.mocked(readScanResult).mockReturnValue(null);

    const res = await GET(req());
    const body = await res.json();

    expect(body).toEqual({ success: true, result: { result: null } });
  });

  it("returns the latest persisted scan result", async () => {
    const outcome = {
      networks: [{ ssid: "HomeNet", signal: 80 }],
      at: "2026-09-10T10:00:00.000Z",
      inProgress: false,
    };
    vi.mocked(readScanResult).mockReturnValue(outcome);

    const res = await GET(req());
    const body = await res.json();

    expect(body.result.result).toEqual(outcome);
  });

  it("surfaces an in-progress scan", async () => {
    vi.mocked(readScanResult).mockReturnValue({
      networks: [],
      at: "2026-09-10T10:00:00.000Z",
      inProgress: true,
    });

    const res = await GET(req());
    const body = await res.json();

    expect(body.result.result.inProgress).toBe(true);
  });
});
