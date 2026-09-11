/**
 * Extract the `[section]` path segment from a sections route URL, i.e. the
 * segment immediately after `/sections/`. Works for the section itself and its
 * sub-resources:
 *   /api/games/g1/sections/A          -> "A"
 *   /api/games/g1/sections/A/movement -> "A"
 *   /api/games/g1/sections/A/tables   -> "A"
 * Returns null when there is no section segment.
 */
export function sectionFromUrl(url: string): string | null {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("sections");
  if (idx === -1) return null;
  const section = parts[idx + 1];
  return section ? decodeURIComponent(section) : null;
}
