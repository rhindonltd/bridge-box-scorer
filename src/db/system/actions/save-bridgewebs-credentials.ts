import "server-only";

import { updateSetting } from "@/db/system/actions/update-setting";
import { encryptSecret } from "@/lib/system/bridgewebs-crypto";

/**
 * Setting keys for the BridgeWebs credentials, stored in the generic `settings`
 * KV table. The club code is stored in plaintext (it is not secret); the
 * password is stored encrypted at rest (see {@link encryptSecret}).
 */
export const BRIDGEWEBS_CLUB_KEY = "bridgewebs_club";
export const BRIDGEWEBS_PASSWORD_ENC_KEY = "bridgewebs_password_enc";

/**
 * Persist the BridgeWebs club code and password. The password is encrypted
 * before storage. Both values are upserted so re-saving overwrites in place.
 */
export async function saveBridgewebsCredentials(
  club: string,
  password: string,
): Promise<void> {
  await updateSetting({ settingKey: BRIDGEWEBS_CLUB_KEY, settingValue: club });
  await updateSetting({
    settingKey: BRIDGEWEBS_PASSWORD_ENC_KEY,
    settingValue: encryptSecret(password),
  });
}

/**
 * Update only the club code, leaving any stored password untouched. Used when
 * the settings form is saved with a blank password field (the director is
 * editing the club code but not rotating the password).
 */
export async function saveBridgewebsClub(club: string): Promise<void> {
  await updateSetting({ settingKey: BRIDGEWEBS_CLUB_KEY, settingValue: club });
}
