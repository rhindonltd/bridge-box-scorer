/**
 * A pair id without its leading section letters, e.g. "A1EW" -> "1EW" and
 * "B3" -> "3". Ids with no section prefix are returned unchanged. Any suffix
 * (such as a `#<occupancy>` handover marker) is left intact.
 */
export function stripSectionPrefix(pairId: string): string {
  return pairId.replace(/^[A-Za-z]+(?=\d)/, "");
}

/** A pair id for display, optionally dropping its section prefix. */
export function pairLabel(pairId: string, hideSection: boolean): string {
  return hideSection ? stripSectionPrefix(pairId) : pairId;
}
