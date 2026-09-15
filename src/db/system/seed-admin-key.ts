import "server-only";

import crypto from "crypto";
import fs from "fs";
import { adminKeyExists, setAdminKey } from "@/db/system/queries/admin-key";
import { adminKeyDataDir, adminKeyFilePath } from "@/db/system/admin-key-file";

/**
 * Alphabet for generated admin keys. Excludes visually ambiguous characters
 * (0/O, 1/I/L) so the key printed on the device label can be typed back without
 * confusion.
 */
const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Number of characters in a generated admin key. */
const KEY_LENGTH = 8;

/**
 * Generates a random, human-friendly admin key using a CSPRNG. Rejection
 * sampling keeps the distribution uniform across the alphabet (no modulo bias).
 *
 * The key is a device secret — it is not derivable from hardware identifiers
 * such as a MAC address, so it stays stable regardless of network adapters and
 * is not guessable by anyone who can observe the appliance's network.
 */
export function generateAdminKey(): string {
  const alphabetLength = KEY_ALPHABET.length;
  // Largest multiple of alphabetLength that fits in a byte; bytes at or above
  // this are discarded to avoid modulo bias.
  const cutoff = 256 - (256 % alphabetLength);

  let key = "";
  while (key.length < KEY_LENGTH) {
    const [byte] = crypto.randomBytes(1);
    if (byte >= cutoff) continue;
    key += KEY_ALPHABET[byte % alphabetLength];
  }

  return key;
}

/**
 * Writes the plaintext admin key to the label file under the data directory,
 * for the provisioning/labelling step to read once. Best-effort: the bcrypt
 * hash in the system DB remains the source of truth, so a failure to write the
 * label file must not abort seeding.
 */
function writeAdminKeyFile(key: string): void {
  const dir = adminKeyDataDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Owner read/write only — the plaintext key should not be world-readable.
  fs.writeFileSync(adminKeyFilePath(), `${key}\n`, { mode: 0o600 });
}

/**
 * Factory seed: generates a random admin key, but only if no admin key has been
 * set yet. Idempotent and safe to run repeatedly — it never overwrites a key
 * the owner has already changed.
 *
 * On seed it stores the bcrypt hash in the system DB and writes the plaintext
 * to the label file (see `adminKeyFilePath`). Returns the plaintext key when it
 * seeds one (so a caller/label tool can display it), or null if a key already
 * existed.
 */
export async function seedAdminKey(): Promise<string | null> {
  if (await adminKeyExists()) {
    return null;
  }

  const key = generateAdminKey();
  await setAdminKey(key);
  writeAdminKeyFile(key);
  return key;
}
