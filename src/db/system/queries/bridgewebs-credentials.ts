import "server-only";

import { findSetting } from "@/db/system/queries/settings";
import { decryptSecret } from "@/lib/system/bridgewebs-crypto";
import {
  BRIDGEWEBS_CLUB_KEY,
  BRIDGEWEBS_PASSWORD_ENC_KEY,
} from "@/db/system/actions/save-bridgewebs-credentials";

/** The decrypted BridgeWebs credentials, for server-side API calls only. */
export type BridgewebsCredentials = {
  club: string;
  password: string;
};

/** Public status of BridgeWebs configuration — never carries the password. */
export type BridgewebsStatus = {
  configured: boolean;
  club: string | null;
};

/**
 * Read and decrypt the stored BridgeWebs credentials. Returns null unless both
 * a club code and a (decryptable) password are present. SERVER-SIDE ONLY: the
 * decrypted password must never be sent to a client — API responses use
 * {@link getBridgewebsStatus} instead.
 */
export async function getBridgewebsCredentials(): Promise<BridgewebsCredentials | null> {
  const club = await findSetting(BRIDGEWEBS_CLUB_KEY);
  const encrypted = await findSetting(BRIDGEWEBS_PASSWORD_ENC_KEY);

  if (!club || !encrypted) return null;

  const password = decryptSecret(encrypted);
  return { club, password };
}

/**
 * Report whether BridgeWebs is configured (both club code and password stored)
 * and expose the club code for display. Deliberately omits the password so it
 * is safe to return from a public (basic) route.
 */
export async function getBridgewebsStatus(): Promise<BridgewebsStatus> {
  const club = await findSetting(BRIDGEWEBS_CLUB_KEY);
  const encrypted = await findSetting(BRIDGEWEBS_PASSWORD_ENC_KEY);

  return {
    configured: Boolean(club && encrypted),
    club: club ?? null,
  };
}
