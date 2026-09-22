"use client";

import { getMessages } from "./index";
import type { Messages } from "./messages";

/**
 * The device's localized message set, for use in client components. The locale
 * is fixed per appliance (from `NEXT_PUBLIC_BRIDGE_LOCALE`), so this returns a
 * stable value and needs no provider/context.
 */
export function useTranslations(): Messages {
  return getMessages();
}
