import os from "os";
import { Page, APIRequestContext } from "@playwright/test";

/**
 * Derive the factory-default admin key from this machine's primary MAC address,
 * mirroring the server's `deriveDefaultAdminKey` (last 6 hex digits of the first
 * non-internal MAC, uppercased). Assumes the app is factory-seeded on the same
 * machine that runs the tests, so the seeded key is derivable here too.
 */
export function deriveAdminKey(): string | null {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.internal) continue;
      if (!iface.mac || iface.mac === "00:00:00:00:00:00") continue;

      const hex = iface.mac.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
      if (hex.length >= 6) {
        return hex.slice(-6);
      }
    }
  }

  return null;
}

/**
 * Verify the (MAC-derived) admin key against the server and return the minted
 * admin session token. Throws if the key can't be derived or is rejected — on a
 * factory-seeded local machine it should always succeed.
 */
export async function fetchAdminToken(
  request: APIRequestContext,
): Promise<string> {
  const key = deriveAdminKey();
  if (!key) {
    throw new Error(
      "Could not derive an admin key from this machine's MAC address.",
    );
  }

  const res = await request.post("/api/system/admin-key/verify", {
    data: { key },
  });

  if (!res.ok()) {
    throw new Error(
      `Admin key verification failed (${res.status()}). The device admin key ` +
        `may have been changed from its MAC-derived default.`,
    );
  }

  const body = await res.json();
  const token = body?.result?.adminToken;
  if (!token) {
    throw new Error("Admin key verify response did not include a token.");
  }
  return token;
}

/**
 * Unlock the settings section for a page by seeding the admin session token
 * into localStorage (the same `admin-token` key the app uses), so the settings
 * layout gate opens without the interactive admin-key entry. Call before
 * navigating to a `/settings/**` route.
 */
export async function unlockSettings(
  page: Page,
  request: APIRequestContext,
): Promise<void> {
  const token = await fetchAdminToken(request);
  await page.addInitScript((t) => {
    window.localStorage.setItem("admin-token", t);
  }, token);
}
