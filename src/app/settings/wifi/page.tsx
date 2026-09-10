"use client";

import { useState } from "react";
import useSWR from "swr";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { WifiUnavailablePage } from "@/app/settings/wifi/WifiUnavailablePage";
import { WifiTestingPage } from "@/app/settings/wifi/WifiTestingPage";
import { WifiScanningPage } from "@/app/settings/wifi/WifiScanningPage";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { fetcher } from "@/lib/fetcher";
import { waitForApReachable } from "@/lib/wifi-recovery";
import { swrKeys } from "@/swr/swr-keys";

type ScanResult = {
  networks: Network[];
  at: string;
  inProgress: boolean;
  failed?: boolean;
  error?: string;
} | null;

export default function WifiSettings() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSSID, setTestingSSID] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Networks from the most recent scan this session. Seeded from the last
  // persisted scan (below) so reopening the screen shows prior results.
  const [networks, setNetworks] = useState<Network[] | null>(null);

  // Capability check WITHOUT scanning: the network endpoint reports whether the
  // device can manage WiFi (has nmcli). We no longer auto-scan on mount — a
  // scan takes the hotspot down and would drop every connected device — so this
  // is how we decide whether to show the "can't change WiFi here" page.
  const { data: net, isLoading: netLoading } = useSWR<{
    wifi: { available: boolean };
  }>(swrKeys.network(), fetcher);

  // Last persisted scan result (read-only; does not trigger a scan).
  const { data: lastScan } = useSWR<{ result: ScanResult }>(
    swrKeys.wifiScanStatus(),
    fetcher,
  );

  // Prefer this session's fresh scan; otherwise fall back to the last persisted
  // scan so the picker isn't empty when reopening the screen.
  const displayNetworks: Network[] = [
    ...(networks ?? lastScan?.result?.networks ?? []),
  ].sort((a, b) => b.signal - a.signal);

  const hasScanned = networks !== null || !!lastScan?.result;

  // Kick off a disruptive scan: bring the AP down, scan, bring it back — which
  // drops THIS device. Mirror the test flow: fire the request, show a
  // reconnect screen, wait for the box to return, then read persisted results.
  const handleScan = async () => {
    setScanning(true);
    setMessage(null);

    try {
      void fetch(swrKeys.wifiScan(), {
        method: "POST",
        headers: { "x-admin-token": getAdminToken() ?? "" },
      }).catch(() => {
        // Expected: the connection drops while the AP is down.
      });

      await waitForApReachable();

      const res = await fetch(swrKeys.wifiScanStatus(), { cache: "no-store" });
      const body = await res.json();
      const result = body?.result?.result as ScanResult;

      if (result?.failed) {
        // Surface the real reason (e.g. an nmcli permission error) to aid
        // diagnosis, falling back to a generic message.
        setMessage(
          result.error
            ? `❌ Scan failed: ${result.error}`
            : "❌ Scan failed. Please try again.",
        );
        return;
      }

      setNetworks(result?.networks ?? []);
      if ((result?.networks ?? []).length === 0) {
        setMessage("No networks found. Try scanning again.");
      }
    } catch {
      setMessage("❌ Error scanning for networks");
    } finally {
      setScanning(false);
    }
  };

  // Testing brings up a client connection, which on a single-radio appliance
  // drops the hosted hotspot — so THIS device loses its connection to the box
  // and never sees the test's HTTP response. Kick off the test, show a
  // full-screen reconnect state, wait for the box's WiFi to return, then read
  // the persisted test outcome.
  const handleTest = async (
    ssid: string,
    password: string,
  ): Promise<boolean> => {
    setTesting(true);
    setTestingSSID(ssid);
    setMessage(null);

    try {
      void fetch("/api/system/wifi/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({ ssid, password }),
      }).catch(() => {
        // Expected: the connection drops while the AP is down.
      });

      await waitForApReachable();

      const res = await fetch(swrKeys.wifiTestStatus(), { cache: "no-store" });
      const body = await res.json();
      const result = body?.result?.result as
        | {
            ssid: string;
            connected: boolean;
            internet?: boolean;
            inProgress: boolean;
          }
        | null;

      const connected =
        !!result &&
        result.ssid === ssid &&
        result.connected &&
        !result.inProgress;

      if (connected) {
        // Associated (credentials valid) — Save is allowed. Distinguish a full
        // connection from one with no route out to the internet.
        setMessage(
          result?.internet === false
            ? "✅ Connected (no internet access detected)"
            : "✅ Connection successful",
        );
      } else {
        setMessage("❌ Failed to connect");
      }
      return connected;
    } catch {
      setMessage("❌ Error testing connection");
      return false;
    } finally {
      setTesting(false);
      setTestingSSID(null);
    }
  };

  const handleSave = async (ssid: string, password: string) => {
    setLoading(true);
    setMessage("Saving WiFi settings...");
    try {
      const adminToken = getAdminToken() ?? "";
      const saveRes = await fetch("/api/system/wifi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ ssid, password }),
      });

      if (saveRes.status === 401) {
        // Stale/invalid admin token — clear it so the settings gate re-prompts
        // instead of rebooting on a save that didn't take.
        clearAdminToken();
        setMessage("Session expired. Please re-enter the admin key.");
        return;
      }
      if (!saveRes.ok) {
        setMessage("Failed to save WiFi");
        return;
      }

      await fetch("/api/system/reboot", {
        method: "POST",
        headers: { "x-admin-token": adminToken },
      });
      // Full-page navigation is intentional: the device is rebooting its WiFi,
      // so we want a hard reload rather than an SPA transition here.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/restarting";
    } catch {
      setMessage("Failed to save WiFi");
    } finally {
      setLoading(false);
    }
  };

  // A device without WiFi management shows the dedicated unavailable page
  // rather than the picker.
  if (!netLoading && net?.wifi.available === false) {
    return <WifiUnavailablePage />;
  }

  // While a scan or test is in flight the app is (or is about to be)
  // disconnected from the box; show a dedicated screen that explains the
  // expected reconnect.
  if (scanning) {
    return <WifiScanningPage />;
  }
  if (testing && testingSSID) {
    return <WifiTestingPage ssid={testingSSID} />;
  }

  return (
    <WifiSettingsForm
      networks={displayNetworks}
      hasScanned={hasScanned}
      scanning={scanning}
      testing={testing}
      loading={loading}
      message={message}
      onScan={handleScan}
      onTestConnection={handleTest}
      onSaveWifi={handleSave}
    />
  );
}
