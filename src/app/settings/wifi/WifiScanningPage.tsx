import { PageLayout } from "@/components/layout/PageLayout";

/**
 * Full-screen state shown while a WiFi scan runs.
 *
 * On a single-radio appliance the scan takes the hosted hotspot down to free
 * the radio, so the director's device disconnects and reconnects on its own.
 * This screen sets that expectation and stays up until the app has polled the
 * box back to life and read the scan results.
 */
export function WifiScanningPage() {
  return (
    <PageLayout headerTitle="Scanning WiFi" centerContent={true}>
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        data-testid="wifi-scanning-page"
      >
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Scanning for WiFi networks…
        </h1>
        <p className="text-base text-gray-600">
          Your device will briefly disconnect from the Bridge Box and reconnect
          automatically. This can take up to a minute — please keep this screen
          open.
        </p>
      </div>
    </PageLayout>
  );
}
