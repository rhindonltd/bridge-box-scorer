import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/system/nmcli", () => ({ runNmcli: vi.fn() }));
vi.mock("@/lib/log", () => ({ logger: { error: vi.fn() } }));

import { runNmcli } from "@/lib/system/nmcli";
import { getOwnAp } from "./wifi-ap";

describe("getOwnAp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the connection name and SSID of the hosted AP", async () => {
    vi.mocked(runNmcli)
      // active connections list (NAME:TYPE)
      .mockResolvedValueOnce("Hotspot:802-11-wireless\nEth:ethernet")
      // details for the wifi connection
      .mockResolvedValueOnce(
        "802-11-wireless.mode:ap\n802-11-wireless.ssid:BridgeBox",
      );

    await expect(getOwnAp()).resolves.toEqual({
      connectionName: "Hotspot",
      ssid: "BridgeBox",
    });
  });

  it("returns null when the wifi connection is not in AP mode", async () => {
    vi.mocked(runNmcli)
      .mockResolvedValueOnce("Home:wifi")
      .mockResolvedValueOnce(
        "802-11-wireless.mode:infrastructure\n802-11-wireless.ssid:Home",
      );

    await expect(getOwnAp()).resolves.toBeNull();
  });

  it("returns null when an AP-mode connection has no ssid line", async () => {
    vi.mocked(runNmcli)
      .mockResolvedValueOnce("Hotspot:wifi")
      // AP mode but the ssid line is absent, so the `&& ssidLine` guard fails.
      .mockResolvedValueOnce("802-11-wireless.mode:ap");

    await expect(getOwnAp()).resolves.toBeNull();
  });

  it("returns null when an AP-mode connection has an empty ssid", async () => {
    vi.mocked(runNmcli)
      .mockResolvedValueOnce("Hotspot:wifi")
      // AP mode with an ssid line present but empty, so `if (ssid)` is false.
      .mockResolvedValueOnce("802-11-wireless.mode:ap\n802-11-wireless.ssid:");

    await expect(getOwnAp()).resolves.toBeNull();
  });

  it("returns null when there are no active wifi connections", async () => {
    vi.mocked(runNmcli).mockResolvedValueOnce("Eth:ethernet");
    await expect(getOwnAp()).resolves.toBeNull();
  });

  it("logs and returns null when nmcli fails", async () => {
    vi.mocked(runNmcli).mockRejectedValueOnce(new Error("nmcli missing"));
    await expect(getOwnAp()).resolves.toBeNull();
  });
});
