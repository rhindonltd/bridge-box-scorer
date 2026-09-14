"use client";

import { useState } from "react";
import { Network } from "@/model/network";
import { getAdminToken, clearAdminToken } from "@/lib/admin-token";
import { waitForApReachable } from "@/lib/wifi-recovery";
import { swrKeys } from "@/swr/swr-keys";

type ScanResult = {
  networks: Network[];
  at: string;
  inProgress: boolean;
  failed?: boolean;
  error?: string;
} | null;

/**
 * Owns the WiFi settings page's in-flight state (scanning / testing / saving /
 * status message and the fresh scan result) plus the three async orchestration
 * handlers. Each handler follows the same appliance-specific dance: fire a
 * disruptive request that drops this device's connection, wait for the box's AP
 * to come back (`waitForApReachable`), then read the persisted result — since
 * the original HTTP response never reaches us once the hotspot goes down.
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

  // Kick off a disruptive scan: bring the AP down, scan, bring it back — which
  // drops THIS device. Fire the request, wait for the box to return, then read
  // persisted results.
  const scan = async () => {
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
  // drops the hosted hotspot — so THIS device never sees the test's HTTP
  // response. Fire the test, wait for the box's WiFi to return, then read the
  // persisted test outcome.
  const test = async (ssid: string, password: string): Promise<boolean> => {
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
