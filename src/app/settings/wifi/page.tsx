"use client";

import useSWR from "swr";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { WifiUnavailablePage } from "@/app/settings/wifi/WifiUnavailablePage";
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
  const { loading, testing, scanning, message, networks, scan, test, save } =
    useWifiActions();

  // Capability check: the network endpoint reports whether the device can
  // manage WiFi (has nmcli). This decides whether to show the "can't change
  // WiFi here" page.
  const { data: net, isLoading: netLoading } = useSWR<{
    wifi: { available: boolean };
  }>(swrKeys.network(), fetcher);

  // Last persisted scan result, so the picker isn't empty when reopening the
  // screen before running a fresh scan.
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
