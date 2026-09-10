import { describe, it, expect, vi, beforeEach } from "vitest";

const { readTestResult } = vi.hoisted(() => ({ readTestResult: vi.fn() }));
vi.mock("@/lib/system/wifi-config", () => ({ readTestResult }));

import { GET } from "./route";

const req = () =>
  new Request("http://localhost/api/system/wifi/test/status", {
    method: "GET",
  }) as never;

describe("GET /api/system/wifi/test/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no test has run", async () => {
    vi.mocked(readTestResult).mockReturnValue(null);

    const res = await GET(req());
    const body = await res.json();

    expect(body).toEqual({ success: true, result: { result: null } });
  });

  it("returns the latest persisted test outcome", async () => {
    const outcome = {
      ssid: "HomeNet",
      connected: true,
      at: "2026-09-10T10:00:00.000Z",
      inProgress: false,
    };
    vi.mocked(readTestResult).mockReturnValue(outcome);

    const res = await GET(req());
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.result.result).toEqual(outcome);
  });

  it("surfaces an in-progress test", async () => {
    vi.mocked(readTestResult).mockReturnValue({
      ssid: "HomeNet",
      connected: false,
      at: "2026-09-10T10:00:00.000Z",
      inProgress: true,
    });

    const res = await GET(req());
    const body = await res.json();

    expect(body.result.result.inProgress).toBe(true);
  });
});
