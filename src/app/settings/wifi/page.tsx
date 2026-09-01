"use client";

import { useState } from "react";
import useSWR from "swr";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { getAdminToken } from "@/lib/admin-token";
import { postFetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

export default function WifiSettings() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // The scan endpoint is a POST (it shells out to nmcli) that returns
  // { ssids } inside the success envelope.
  const { data, error } = useSWR<{ ssids: Network[] }>(
    swrKeys.wifiScan(),
    postFetcher,
  );

  const networks = [...(data?.ssids ?? [])].sort((a, b) => b.signal - a.signal);

  const scanFailedMessage = error ? "Failed to load WiFi networks" : null;

  const handleTest = async (
    ssid: string,
    password: string,
  ): Promise<boolean> => {
    setTesting(true);
    setMessage("Testing connection...");
    try {
      const res = await fetch("/api/system/wifi/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({ ssid, password }),
      });
      const data = await res.json();
      setMessage(
        data.success ? "✅ Connection successful" : "❌ Failed to connect",
      );
      return data.success;
    } catch {
      setMessage("❌ Error testing connection");
      return false;
    } finally {
      setTesting(false);
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

  return (
    <WifiSettingsForm
      networks={networks}
      testing={testing}
      loading={loading}
      message={message ?? scanFailedMessage}
      onTestConnection={handleTest}
      onSaveWifi={handleSave}
    />
  );
}
