import { parseSeat } from "@/model/participants";

/**
 * The fewest tables a section may have. A one-table section cannot run a
 * movement (there is nobody to play against), so every section — and every side
 * of a split — must keep at least this many tables. Mirrors the `min` on the
 * Tables screen's per-section table stepper.
 */
export const MIN_SECTION_TABLES = 2;

/**
 * Whether a section with `tables` tables is large enough to split into two
 * sections that each satisfy {@link MIN_SECTION_TABLES}. Splitting moves some
 * tables to a new section, so the source must hold two valid sections' worth.
 */
export function canSplitSection(tables: number): boolean {
  return tables >= MIN_SECTION_TABLES * 2;
}

/** The minimal section shape the seat-range check needs. */
export interface SectionTableBounds {
  section: string;
  tables: number;
}

/**
 * Whether `seat` names a real table in the current layout: its section must
 * exist and its table number must be in `1..section.tables`. Guards against a
 * seat that was valid when a device picked it but has since been invalidated —
 * e.g. a section split that shrank the section out from under a table number a
 * mid-join device still holds, or any stale/forged seat. Returns false for an
 * unparseable seat.
 */
export function isSeatInSections(
  seat: string,
  sections: SectionTableBounds[],
): boolean {
  let parsed: { section: string; tableNumber: number };
  try {
    parsed = parseSeat(seat);
  } catch {
    return false;
  }

  const section = sections.find((s) => s.section === parsed.section);
  if (!section) return false;

  return parsed.tableNumber >= 1 && parsed.tableNumber <= section.tables;
}
