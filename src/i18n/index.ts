import { resolveLocale, type Locale } from "./locale";
import { MESSAGES, type Messages } from "./messages";

export { LOCALES, DEFAULT_LOCALE, resolveLocale } from "./locale";
export type { Locale } from "./locale";
export type { Messages, ScoringOption } from "./messages";

/**
 * The message set for a locale (defaulting to the device's resolved locale).
 * Framework-free, so it works in server code, route handlers, and — because the
 * locale comes from a build-inlined `NEXT_PUBLIC_` env var — client components.
 */
export function getMessages(locale: Locale = resolveLocale()): Messages {
  return MESSAGES[locale];
}
