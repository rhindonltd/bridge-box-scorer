"use client";

import { useState } from "react";
import { Network } from "@/model/network";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { swrKeys } from "@/swr/swr-keys";

/**
 * Owns the WiFi settings page's in-flight state (scanning / testing / saving /
 * status message and the fresh scan result) plus the three async orchestration
 * handlers.
 *
 * The appliance now has a dedicated uplink WiFi adapter separate from the one
 * hosting the players' access point, so scanning and testing no longer take the
 * hotspot down. That means the client stays connected throughout and reads each
 * outcome directly from the request's own HTTP response — no "fire, wait for the
 * AP to return, then re-read a persisted result" dance is needed. Only Save
 * still reboots the box (and drops this device), so it keeps the hard reload.
 *
 * Extracted from the page component so the page is left as SWR reads +
 * presentation over this hook's returned state/actions.
 */
export function useWifiActions() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingSSID, setTestingSSID] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Networks from the most recent scan this session (null until a scan runs).
  const [networks, setNetworks] = useState<Network[] | null>(null);

  // Scan for nearby networks. With a dedicated uplink adapter the hotspot stays
  // up, so we just await the scan response and read the networks from it.
  const scan = async () => {
    setScanning(true);
    setMessage(null);

    try {
      const res = await fetch(swrKeys.wifiScan(), {
        method: "POST",
        headers: { "x-admin-token": getAdminToken() ?? "" },
      });
      const body = await res.json();

      if (!body?.success) {
        // Surface the real reason (e.g. an nmcli permission error) to aid
        // diagnosis, falling back to a generic message.
        setMessage(
          body?.error
            ? `❌ Scan failed: ${body.error}`
            : "❌ Scan failed. Please try again.",
        );
        return;
      }

      const found = (body.networks ?? []) as Network[];
      setNetworks(found);
      if (found.length === 0) {
        setMessage("No networks found. Try scanning again.");
      }
    } catch {
      setMessage("❌ Error scanning for networks");
    } finally {
      setScanning(false);
    }
  };

  // Test whether the box can associate with the given network. With a dedicated
  // uplink adapter the hotspot stays up during the test, so we read the outcome
  // straight from the test response.
  const test = async (ssid: string, password: string): Promise<boolean> => {
    setTesting(true);
    setTestingSSID(ssid);
    setMessage(null);

    try {
      const res = await fetch("/api/system/wifi/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": getAdminToken() ?? "",
        },
        body: JSON.stringify({ ssid, password }),
      });
      const body = await res.json();

      const connected = !!body?.success && !!body?.result?.connected;

      if (connected) {
        // Associated (credentials valid) — Save is allowed. Distinguish a full
        // connection from one with no route out to the internet.
        setMessage(
          body?.result?.internet === false
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

  const save = async (ssid: string, password: string) => {
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

  return {
    // in-flight state
    loading,
    testing,
    testingSSID,
    scanning,
    message,
    /** This session's fresh scan result (null until a scan has run). */
    networks,
    // actions
    scan,
    test,
    save,
  };
}
