import { describe, it, expect } from "vitest";
import { parseWifiScan } from "@/lib/system/wifi-scan";

describe("parseWifiScan", () => {
  it("parses SSID and signal from nmcli -t output", () => {
    const stdout = ["HomeNet:WPA2:80", "Cafe:--:55"].join("\n");

    expect(parseWifiScan(stdout)).toEqual([
      { ssid: "HomeNet", signal: 80 },
      { ssid: "Cafe", signal: 55 },
    ]);
  });

  it("collapses duplicate SSIDs to the first occurrence", () => {
    const stdout = ["HomeNet:WPA2:80", "HomeNet:WPA2:70"].join("\n");

    const result = parseWifiScan(stdout);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ ssid: "HomeNet", signal: 80 });
  });

  it("drops blank SSIDs (hidden networks)", () => {
    const stdout = ["HomeNet:WPA2:80", ":WPA2:40", "Cafe:--:55"].join("\n");

    const ssids = parseWifiScan(stdout).map((n) => n.ssid);
    expect(ssids).toEqual(["HomeNet", "Cafe"]);
  });

  it("ignores empty lines", () => {
    const stdout = ["HomeNet:WPA2:80", "", "Cafe:--:55", ""].join("\n");

    expect(parseWifiScan(stdout).map((n) => n.ssid)).toEqual([
      "HomeNet",
      "Cafe",
    ]);
  });

  it("excludes the appliance's own AP SSID when provided", () => {
    const stdout = [
      "BridgeBox:WPA2:99",
      "HomeNet:WPA2:80",
      "Cafe:--:55",
    ].join("\n");

    const ssids = parseWifiScan(stdout, { excludeSSID: "BridgeBox" }).map(
      (n) => n.ssid,
    );
    expect(ssids).toEqual(["HomeNet", "Cafe"]);
  });

  it("treats a null/undefined excludeSSID as no exclusion", () => {
    const stdout = ["HomeNet:WPA2:80"].join("\n");

    expect(parseWifiScan(stdout, { excludeSSID: null })).toHaveLength(1);
    expect(parseWifiScan(stdout, {})).toHaveLength(1);
  });

  it("returns an empty list for empty output", () => {
    expect(parseWifiScan("")).toEqual([]);
  });
});
