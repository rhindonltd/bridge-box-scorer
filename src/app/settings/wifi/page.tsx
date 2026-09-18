"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Network } from "@/model/network";
import { WifiSettingsForm } from "@/app/settings/wifi/WifiSettingsForm";
import { WifiUnavailablePage } from "@/app/settings/wifi/WifiUnavailablePage";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useWifiActions } from "./useWifiActions";

export default function WifiSettings() {
  const router = useRouter();
  const {
    loading,
    testing,
    scanning,
    message,
    networks,
    hasScanned,
    scan,
    test,
    save,
  } = useWifiActions();

  // Capability check: the network endpoint reports whether the device can
  // manage WiFi (has nmcli). This decides whether to show the "can't change
  // WiFi here" page. The scan itself runs automatically from useWifiActions.
  const { data: net, isLoading: netLoading } = useSWR<{
    wifi: { available: boolean };
  }>(swrKeys.network(), fetcher);

  const displayNetworks: Network[] = [...(networks ?? [])].sort(
    (a, b) => b.signal - a.signal,
  );

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
      onBack={() => router.back()}
    />
  );
}
