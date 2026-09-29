import { Db } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { eq } from "drizzle-orm";
import {
  parseSelectedMovement,
  SelectedMovement,
} from "@/model/selected-movement";

/**
 * Read and parse the selected movement for a single section. Returns null when
 * the section has no movement chosen yet (or the stored value is invalid).
 */
export async function getSectionMovement(
  db: Db,
  section: string,
): Promise<SelectedMovement | null> {
  const row = await db
    .select({ selectedMovement: sections.selectedMovement })
    .from(sections)
    .where(eq(sections.section, section))
    .get();

  return parseSelectedMovement(row?.selectedMovement);
}

/**
 * Read the first section's selected movement (sections ordered by letter). Used
 * as the game-level movement for cross-cutting classification (leaderboard /
 * export) when the game-index copy isn't set — the movement is actually stored
 * per section, and every section of a game shares the same movement family, so
 * any section's selection answers "what kind of event is this". Returns null
 * when no section has a (valid) movement yet.
 */
export async function getAnySectionMovement(
  db: Db,
): Promise<SelectedMovement | null> {
  const rows = await db
    .select({
      section: sections.section,
      selectedMovement: sections.selectedMovement,
    })
    .from(sections)
    .all();

  const ordered = [...rows].sort((a, b) =>
    a.section < b.section ? -1 : a.section > b.section ? 1 : 0,
  );
  for (const row of ordered) {
    const parsed = parseSelectedMovement(row.selectedMovement);
    if (parsed) return parsed;
  }
  return null;
}
