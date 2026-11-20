import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";

/**
 * Every simulated device in the journeys connects from this machine, so the
 * Bridge Box would see them all as one device when counting failed sign-in
 * attempts. The e2e server trusts this header instead (see
 * src/lib/net/client-address.ts), so each browser context gets its own id
 * and is counted as its own device. A real Bridge Box ignores the header.
 */
export function testDeviceHeaders(
  id: string = randomUUID(),
): Record<string, string> {
  return { "x-bridgebox-test-device": id };
}

/**
 * Journeys sign in to Settings behind the scenes (to set club details and so
 * on), and every Settings sign-in alerts every director device with a popup
 * that stays until dismissed. Outside the journeys that test the alerts, that
 * popup would sit over whatever the journey is trying to tap, so dismiss it
 * whenever it gets in the way.
 */
export async function dismissDirectorAlertsOn(page: Page): Promise<void> {
  const dialog = page.getByRole("alertdialog");
  await page.addLocatorHandler(dialog, async () => {
    const dismiss = dialog.getByRole("button", { name: "Dismiss" });
    while ((await dismiss.count()) > 0) {
      await dismiss.first().click();
    }
  });
}

/** {@link dismissDirectorAlertsOn} for every page the context opens. */
export function dismissDirectorAlertsIn(context: BrowserContext): void {
  for (const page of context.pages()) void dismissDirectorAlertsOn(page);
  context.on("page", (page) => void dismissDirectorAlertsOn(page));
}
