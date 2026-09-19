import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/admin-token", () => ({
  getAdminToken: vi.fn(() => "admin-tok"),
  clearAdminToken: vi.fn(),
}));

import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { useWifiActions } from "./useWifiActions";

/** Build a fetch Response-like object resolving to `body`. */
function res(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  };
}

/**
 * Render the hook and wait for the automatic first scan (fired on mount via a
 * microtask) to finish, so each test starts from a settled state.
 */
async function renderSettled(
  firstScan = res({ success: true, result: { networks: [] } }),
) {
  const fetchMock = vi.fn().mockResolvedValueOnce(firstScan);
  vi.stubGlobal("fetch", fetchMock);
  const hook = renderHook(() => useWifiActions());
  await waitFor(() => expect(hook.result.current.hasScanned).toBe(true));
  return { hook, fetchMock };
}

describe("useWifiActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminToken).mockReturnValue("admin-tok");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("scan (auto on mount)", () => {
    it("stores the found networks and marks the scan complete", async () => {
      const { hook } = await renderSettled(
        res({ success: true, result: { networks: [{ ssid: "Home" }] } }),
      );
      expect(hook.result.current.networks).toEqual([{ ssid: "Home" }]);
      expect(hook.result.current.scanning).toBe(false);
    });

    it("sets a 'no networks' message when the scan returns none", async () => {
      const { hook } = await renderSettled(
        res({ success: true, result: { networks: [] } }),
      );
      expect(hook.result.current.message).toBe(
        "No networks found. Try scanning again.",
      );
    });

    it("surfaces the server error when the scan fails", async () => {
      const { hook } = await renderSettled(
        res({ success: false, error: "nmcli denied" }),
      );
      expect(hook.result.current.message).toBe("❌ Scan failed: nmcli denied");
    });

    it("shows a generic scan-failed message when no error is given", async () => {
      const { hook } = await renderSettled(res({ success: false }));
      expect(hook.result.current.message).toBe(
        "❌ Scan failed. Please try again.",
      );
    });

    it("reports a network error when the scan request throws", async () => {
      const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"));
      vi.stubGlobal("fetch", fetchMock);
      const { result } = renderHook(() => useWifiActions());
      await waitFor(() => expect(result.current.hasScanned).toBe(true));
      expect(result.current.message).toBe("❌ Error scanning for networks");
    });
  });

  describe("test", () => {
    it("returns true and confirms success on a full connection", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(
        res({ success: true, result: { connected: true, internet: true } }),
      );

      let connected: boolean | undefined;
      await act(async () => {
        connected = await hook.result.current.test("Home", "pw");
      });

      expect(connected).toBe(true);
      expect(hook.result.current.message).toBe("✅ Connection successful");
    });

    it("notes when connected but no internet route was detected", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(
        res({ success: true, result: { connected: true, internet: false } }),
      );

      await act(async () => {
        await hook.result.current.test("Home", "pw");
      });
      expect(hook.result.current.message).toBe(
        "✅ Connected (no internet access detected)",
      );
    });

    it("returns false and surfaces the server error when the test fails", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(
        res({ success: false, error: "helper failed" }),
      );

      let connected: boolean | undefined;
      await act(async () => {
        connected = await hook.result.current.test("Home", "pw");
      });
      expect(connected).toBe(false);
      expect(hook.result.current.message).toBe("❌ helper failed");
    });

    it("shows a generic failure message when the test gives no error", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(res({ success: true, result: {} }));

      await act(async () => {
        await hook.result.current.test("Home", "pw");
      });
      expect(hook.result.current.message).toBe("❌ Failed to connect");
    });

    it("reports a network error when the test request throws", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockRejectedValueOnce(new Error("boom"));

      let connected: boolean | undefined;
      await act(async () => {
        connected = await hook.result.current.test("Home", "pw");
      });
      expect(connected).toBe(false);
      expect(hook.result.current.message).toBe("❌ Error testing connection");
    });
  });

  describe("save", () => {
    it("confirms success when the save is accepted", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(res({ success: true }, { ok: true }));

      await act(async () => {
        await hook.result.current.save("Home", "pw");
      });
      expect(hook.result.current.message).toBe("✅ WiFi settings saved");
    });

    it("clears the admin token and re-prompts on a 401", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(res({}, { status: 401, ok: false }));

      await act(async () => {
        await hook.result.current.save("Home", "pw");
      });
      expect(clearAdminToken).toHaveBeenCalled();
      expect(hook.result.current.message).toBe(
        "Session expired. Please re-enter the admin key.",
      );
    });

    it("reports failure on a non-ok, non-401 response", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockResolvedValueOnce(res({}, { status: 500, ok: false }));

      await act(async () => {
        await hook.result.current.save("Home", "pw");
      });
      expect(hook.result.current.message).toBe("Failed to save WiFi");
    });

    it("reports failure when the save request throws", async () => {
      const { hook, fetchMock } = await renderSettled();
      fetchMock.mockRejectedValueOnce(new Error("network down"));

      await act(async () => {
        await hook.result.current.save("Home", "pw");
      });
      expect(hook.result.current.message).toBe("Failed to save WiFi");
    });
  });

  // The three request builders each fall back to an empty admin-token header
  // when none is stored (`getAdminToken() ?? ""`). Drive that fallback and
  // assert the outgoing header is empty.
  describe("missing admin token falls back to an empty header", () => {
    function tokenHeaderOf(call: unknown[]): string {
      const init = call[1] as { headers: Record<string, string> };
      return init.headers["x-admin-token"];
    }

    it("scan sends an empty admin-token header", async () => {
      vi.mocked(getAdminToken).mockReturnValue(null);
      const { fetchMock } = await renderSettled(
        res({ success: true, result: { networks: [] } }),
      );
      expect(tokenHeaderOf(fetchMock.mock.calls[0])).toBe("");
    });

    it("test sends an empty admin-token header", async () => {
      const { hook, fetchMock } = await renderSettled();
      vi.mocked(getAdminToken).mockReturnValue(null);
      fetchMock.mockResolvedValueOnce(
        res({ success: true, result: { connected: true, internet: true } }),
      );

      await act(async () => {
        await hook.result.current.test("Home", "pw");
      });
      expect(tokenHeaderOf(fetchMock.mock.calls.at(-1)!)).toBe("");
    });

    it("save sends an empty admin-token header", async () => {
      const { hook, fetchMock } = await renderSettled();
      vi.mocked(getAdminToken).mockReturnValue(null);
      fetchMock.mockResolvedValueOnce(res({ success: true }, { ok: true }));

      await act(async () => {
        await hook.result.current.save("Home", "pw");
      });
      expect(tokenHeaderOf(fetchMock.mock.calls.at(-1)!)).toBe("");
    });
  });

  // A successful scan whose body omits `result` (or its `networks`) falls back
  // to an empty list rather than throwing.
  it("treats a scan response with no result as zero networks", async () => {
    const { hook } = await renderSettled(res({ success: true }));
    expect(hook.result.current.networks).toEqual([]);
    expect(hook.result.current.message).toBe(
      "No networks found. Try scanning again.",
    );
  });
});
