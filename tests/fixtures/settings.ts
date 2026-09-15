import fs from "fs";
import path from "path";
import { Page, APIRequestContext } from "@playwright/test";

/**
 * Read the factory-seeded admin key from the plaintext label file the server
 * writes at first-boot seed time (`seedAdminKey` -> `admin-key.txt`). Mirrors
 * the server's data-dir resolution (`DATABASE_URL`, falling back to the
 * appliance path) so the tests locate the same file. Assumes the app is
 * factory-seeded on the same machine that runs the tests.
 *
 * Returns null if the label file does not exist (e.g. the key was seeded before
 * this file existed, or the owner rotated it), so callers can skip gracefully.
 */
export function deriveAdminKey(): string | null {
  const dataDir = process.env.DATABASE_URL ?? "/home/bridgebox/data";
  const keyFile = path.join(dataDir, "admin-key.txt");

  try {
    const contents = fs.readFileSync(keyFile, "utf8").trim();
    return contents.length > 0 ? contents : null;
  } catch {
    return null;
  }
}

/**
 * Read the factory-seeded admin key, verify it against the server, and return
 * the minted admin session token. Throws if the key can't be read or is
 * rejected — on a factory-seeded local machine it should always succeed.
 */
export async function fetchAdminToken(
  request: APIRequestContext,
): Promise<string> {
  const key = deriveAdminKey();
  if (!key) {
    throw new Error(
      "Could not read the admin key label file (admin-key.txt) for this device.",
    );
  }

  const res = await request.post("/api/system/admin-key/verify", {
    data: { key },
  });

  if (!res.ok()) {
    throw new Error(
      `Admin key verification failed (${res.status()}). The device admin key ` +
        `may have been changed from its factory-seeded default.`,
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
