"use client";

import { PageLayout } from "@/components/layout/PageLayout";

/**
 * Shown on the WiFi settings screen when the device cannot manage WiFi (no
 * NetworkManager / nmcli). Rather than a broken or empty network picker, we
 * tell the director plainly that WiFi settings are not changeable here.
 */
export function WifiUnavailablePage() {
  return (
    <PageLayout headerTitle="Wifi Settings" centerContent={true}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          WiFi settings can&apos;t be changed on this device
        </h1>
        <p className="text-base text-gray-600" data-testid="wifi-unavailable">
          This device does not support changing WiFi settings from the app.
        </p>
      </div>
    </PageLayout>
  );
}
