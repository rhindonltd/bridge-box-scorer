"use client";

import { useEffect, useState } from "react";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/components/pages/settings/WifiSettingsForm";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "";

export default function WifiSettings() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/system/wifi/scan")
      .then((res) => res.json())
      .then((data: Network[]) => {
        if (!cancelled) {
          data.sort((a, b) => b.signal - a.signal);
          setNetworks(data);
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("Failed to load WiFi networks");
      });
    return () => { cancelled = true; };
  }, []);

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
          "x-admin-key": ADMIN_KEY,
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
      await fetch("/api/system/wifi", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
        body: JSON.stringify({ ssid, password }),
      });
      await fetch("/api/system/restart", {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
      });
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
      message={message}
      onTestConnection={handleTest}
      onSaveWifi={handleSave}
    />
  );
}
