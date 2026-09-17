import "server-only";

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { bridgewebsKeyFilePath } from "@/lib/system/bridgewebs-key-file";

/**
 * Symmetric encryption for the stored BridgeWebs password.
 *
 * The password is stored in the `settings` KV table but must not sit there in
 * plaintext. We encrypt it with AES-256-GCM using a random 32-byte key that
 * lives in a file on the appliance, separate from the database (so a DB copy
 * alone can't decrypt). The key is generated once on first use and reused
 * thereafter.
 *
 * The encrypted payload is encoded as three base64 segments joined by colons:
 *   `<iv>:<authTag>:<ciphertext>`
 * GCM's auth tag makes tampering detectable — `decryptSecret` throws if the
 * payload (or key) has been altered.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // GCM standard nonce length

/**
 * Load the encryption key from the key file, generating and persisting a new
 * random key on first use. The write is atomic (temp sibling + fsync + rename
 * in the same directory) so a concurrent reader never observes a half-written
 * key file, matching the appliance's other on-disk secret writes.
 */
function loadOrCreateKey(): Buffer {
  const keyPath = bridgewebsKeyFilePath();

  if (fs.existsSync(keyPath)) {
    const stored = fs.readFileSync(keyPath, "utf-8").trim();
    const key = Buffer.from(stored, "base64");
    if (key.length === KEY_BYTES) return key;
    // A malformed/short key file would make every password undecryptable and
    // is a sign of corruption; fail loudly rather than silently regenerating
    // (which would orphan the existing ciphertext).
    throw new Error(
      `BridgeWebs key file at ${keyPath} is invalid (expected ${KEY_BYTES} bytes).`,
    );
  }

  const key = crypto.randomBytes(KEY_BYTES);
  const dir = path.dirname(keyPath);
  const tmpPath = path.join(
    dir,
    `.${path.basename(keyPath)}.${process.pid}.${Date.now()}.tmp`,
  );

  const fd = fs.openSync(tmpPath, "w", 0o600);
  try {
    fs.writeFileSync(fd, key.toString("base64"));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    fs.renameSync(tmpPath, keyPath);
  } catch (err) {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // best-effort cleanup; surface the original rename error
    }
    throw err;
  }

  return key;
}

/** Encrypt a plaintext secret into the `iv:tag:ciphertext` (base64) form. */
export function encryptSecret(plain: string): string {
  const key = loadOrCreateKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf-8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a payload produced by {@link encryptSecret}. Throws if the payload is
 * malformed or fails GCM authentication (tampered ciphertext / wrong key).
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted payload.");
  }
  const [ivB64, tagB64, dataB64] = parts;

  const key = loadOrCreateKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plain.toString("utf-8");
}
