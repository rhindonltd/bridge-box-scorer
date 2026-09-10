"use client";

import { useState } from "react";
import useSWR from "swr";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { WifiUnavailablePage } from "@/app/settings/wifi/WifiUnavailablePage";
import { WifiTestingPage } from "@/app/settings/wifi/WifiTestingPage";
import { getAdminToken } from "@/lib/admin-token";
import { postFetcher } from "@/lib/fetcher";
import { waitForApReachable } from "@/lib/wifi-recovery";
import { swrKeys } from "@/swr/swr-keys";

export default function WifiSettings() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSSID, setTestingSSID] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // The scan endpoint is a POST (it shells out to nmcli) that returns
  // { available, ssids } inside the success envelope. `available` is false on
  // devices without WiFi management (no nmcli), in which case we show a
  // dedicated "can't change WiFi here" page instead of the picker.
  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    available: boolean;
    ssids: Network[];
  }>(swrKeys.wifiScan(), postFetcher);

  const networks = [...(data?.ssids ?? [])].sort((a, b) => b.signal - a.signal);

  const scanFailedMessage = error ? "Failed to load WiFi networks" : null;

  const handleRescan = () => {
    void mutate();
  };

  // Testing brings up a client connection, which on a single-radio appliance
  // drops the hosted hotspot — so THIS device loses its connection to the box
  // and never sees the test's HTTP response. Instead we: kick off the test,
  // show a full-screen "reconnecting" state, wait for the box's WiFi to return,
  // then read the persisted test outcome to learn whether it connected.
  const handleTest = async (
    ssid: string,
    password: string,
  ): Promise<boolean> => {
    setTesting(true);
    setTestingSSID(ssid);
    setMessage(null);

    try {
      // Fire-and-forget: this request likely never returns to us because the AP
      // drops mid-request. The outcome is persisted server-side and read below.
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

      // Wait for the appliance's hotspot to come back and this device to
      // reconnect, then read the persisted test result.
      await waitForApReachable();

      const res = await fetch(swrKeys.wifiTestStatus(), { cache: "no-store" });
      const body = await res.json();
      const result = body?.result?.result as
        | { ssid: string; connected: boolean; inProgress: boolean }
        | null;

      const connected =
        !!result && result.ssid === ssid && result.connected && !result.inProgress;

      setMessage(
        connected ? "✅ Connection successful" : "❌ Failed to connect",
      );
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
      await fetch("/api/system/wifi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ ssid, password }),
      });
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

  // Once the scan resolves, a device without WiFi management shows the
  // dedicated unavailable page rather than the (empty) picker.
  if (!isLoading && !error && data?.available === false) {
    return <WifiUnavailablePage />;
  }

  // While a test is in flight the app is (or is about to be) disconnected from
  // the box; show a dedicated screen that explains the expected reconnect.
  if (testing && testingSSID) {
    return <WifiTestingPage ssid={testingSSID} />;
  }

  return (
    <WifiSettingsForm
      networks={networks}
      testing={testing}
      loading={loading}
      scanning={isValidating}
      message={message ?? scanFailedMessage}
      onTestConnection={handleTest}
      onSaveWifi={handleSave}
      onRescan={handleRescan}
    />
  );
}
