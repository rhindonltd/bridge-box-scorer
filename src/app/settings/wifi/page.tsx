"use client";

import useSWR from "swr";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { WifiUnavailablePage } from "@/app/settings/wifi/WifiUnavailablePage";
import { WifiTestingPage } from "@/app/settings/wifi/WifiTestingPage";
import { WifiScanningPage } from "@/app/settings/wifi/WifiScanningPage";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useWifiActions } from "./useWifiActions";

type ScanResult = {
  networks: Network[];
  at: string;
  inProgress: boolean;
  failed?: boolean;
  error?: string;
} | null;

export default function WifiSettings() {
  const { loading, testing, testingSSID, scanning, message, networks, scan, test, save } =
    useWifiActions();

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
      onScan={scan}
      onTestConnection={test}
      onSaveWifi={save}
    />
  );
}
