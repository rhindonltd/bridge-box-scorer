/**
 * The locales the app supports. English only for now, differing by region —
 * chiefly bridge terminology (e.g. "Point-a-Board" in the UK vs "Board-a-Match"
 * in the US). `en-GB` is the default.
 */
export const LOCALES = ["en-GB", "en-US"] as const;

export type Locale = (typeof LOCALES)[number];

/** The locale used when none is configured or the configured value is unknown. */
export const DEFAULT_LOCALE: Locale = "en-GB";

/** Narrow an arbitrary string to a supported `Locale`, or null if unsupported. */
function asLocale(value: string | undefined): Locale | null {
  return LOCALES.includes(value as Locale) ? (value as Locale) : null;
}

/**
 * The device's configured locale.
 *
 * Read from the `NEXT_PUBLIC_BRIDGE_LOCALE` build-time env var (provisioned per
 * appliance), so the same value is available on the server and inlined into the
 * client bundle. Falls back to {@link DEFAULT_LOCALE} when unset or set to an
 * unrecognised value, so a missing/typo'd config never breaks the UI.
 */
export function resolveLocale(): Locale {
  return asLocale(process.env.NEXT_PUBLIC_BRIDGE_LOCALE) ?? DEFAULT_LOCALE;
}
