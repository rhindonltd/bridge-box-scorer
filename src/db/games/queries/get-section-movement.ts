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
