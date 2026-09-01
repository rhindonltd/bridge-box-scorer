import "server-only";

import os from "os";
import { adminKeyExists, setAdminKey } from "@/db/system/queries/admin-key";

/**
 * Derives the factory-default admin key from the device's primary MAC address.
 *
 * The default is the last 6 hex digits of the MAC (uppercased, no separators),
 * e.g. a MAC of `dc:a6:32:ab:cd:ef` yields `ABCDEF`. This value is printed on a
 * label attached to the device so a new owner can access the admin section.
 *
 * Returns null if no usable MAC address can be found.
 */
export function deriveDefaultAdminKey(): string | null {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      // Skip loopback / interfaces without a real hardware address.
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
 * Factory seed: sets the admin key from the device MAC address, but only if no
 * admin key has been set yet. Idempotent and safe to run repeatedly — it never
 * overwrites a key the owner has already changed.
 *
 * Returns the plaintext default key when it seeds one (so a caller/label tool
 * can display it), or null if a key already existed or no MAC was found.
 */
export async function seedAdminKey(): Promise<string | null> {
  if (await adminKeyExists()) {
    return null;
  }

  const defaultKey = deriveDefaultAdminKey();
  if (!defaultKey) {
    return null;
  }

  await setAdminKey(defaultKey);
  return defaultKey;
}
