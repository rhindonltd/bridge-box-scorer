import "server-only";

import { findSetting } from "@/db/system/queries/settings";
import { decryptSecret } from "@/lib/system/bridgewebs-crypto";
import {
  EBU_NUMBER_KEY,
  EBU_PASSWORD_ENC_KEY,
} from "@/db/system/actions/save-ebu-credentials";

/** The decrypted EBU credentials, for server-side API calls only. */
export type EbuCredentials = {
  /** The EBU club/county number — used as the Basic-Auth username. */
  ebuNumber: string;
  password: string;
};

/** Public status of EBU configuration — never carries the password. */
export type EbuStatus = {
  configured: boolean;
  ebuNumber: string | null;
};

/**
 * Read and decrypt the stored EBU credentials. Returns null unless both an EBU
 * number and a (decryptable) password are present. SERVER-SIDE ONLY: the
 * decrypted password must never be sent to a client — API responses use
 * {@link getEbuStatus} instead.
 */
export async function getEbuCredentials(): Promise<EbuCredentials | null> {
  const ebuNumber = await findSetting(EBU_NUMBER_KEY);
  const encrypted = await findSetting(EBU_PASSWORD_ENC_KEY);

  if (!ebuNumber || !encrypted) return null;

  const password = decryptSecret(encrypted);
  return { ebuNumber, password };
}

/**
 * Report whether EBU is configured (both number and password stored) and
 * expose the EBU number for display. Deliberately omits the password so it is
 * safe to return from a public (basic) route.
 */
export async function getEbuStatus(): Promise<EbuStatus> {
  const ebuNumber = await findSetting(EBU_NUMBER_KEY);
  const encrypted = await findSetting(EBU_PASSWORD_ENC_KEY);

  return {
    configured: Boolean(ebuNumber && encrypted),
    ebuNumber: ebuNumber ?? null,
  };
}
