import { PageLayout } from "@/components/layout/PageLayout";

/**
 * Full-screen state shown while a WiFi connection test runs.
 *
 * Testing brings up a throwaway client connection, which on a single-radio
 * appliance briefly drops the hosted hotspot — so the director's device
 * disconnects and reconnects on its own. This screen explains that so a blip is
 * expected rather than alarming, and stays up until the app has polled the box
 * back to life and read the test outcome.
 */
export function WifiTestingPage({ ssid }: { ssid: string }) {
  return (
    <PageLayout headerTitle="Testing WiFi" centerContent={true}>
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        data-testid="wifi-testing"
      >
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Testing connection to {ssid}…
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
