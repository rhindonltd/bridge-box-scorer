import "server-only";

import { updateSetting } from "@/db/system/actions/update-setting";
import { encryptSecret } from "@/lib/system/bridgewebs-crypto";

/**
 * Setting keys for the EBU API credentials, stored in the generic `settings`
 * KV table. The EBU club/county number is the Basic-Auth username and is stored
 * in plaintext (it is not secret); the password is stored encrypted at rest
 * (see {@link encryptSecret}), reusing the appliance's shared AES key.
 */
export const EBU_NUMBER_KEY = "ebu_number";
export const EBU_PASSWORD_ENC_KEY = "ebu_password_enc";

/**
 * Persist the EBU number and password. The password is encrypted before
 * storage. Both values are upserted so re-saving overwrites in place.
 */
export async function saveEbuCredentials(
  ebuNumber: string,
  password: string,
): Promise<void> {
  await updateSetting({ settingKey: EBU_NUMBER_KEY, settingValue: ebuNumber });
  await updateSetting({
    settingKey: EBU_PASSWORD_ENC_KEY,
    settingValue: encryptSecret(password),
  });
}

/**
 * Update only the EBU number, leaving any stored password untouched. Used when
 * the settings form is saved with a blank password field (the director is
 * editing the number but not rotating the password).
 */
export async function saveEbuNumber(ebuNumber: string): Promise<void> {
  await updateSetting({ settingKey: EBU_NUMBER_KEY, settingValue: ebuNumber });
}
