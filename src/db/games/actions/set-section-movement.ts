import "server-only";

import { getDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { eq } from "drizzle-orm";
import {
  SelectedMovement,
  serializeSelectedMovement,
} from "@/model/selected-movement";

/**
 * Set (or clear) the selected movement for a single section, stored as JSON on
 * the section row. Pass null to clear the selection.
 */
export async function setSectionMovement(
  gameId: string,
  section: string,
  selected: SelectedMovement | null,
): Promise<void> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  const existing = await db
    .select()
    .from(sections)
    .where(eq(sections.section, section))
    .get();

  if (!existing) {
    throw new Error(`Section ${section} does not exist`);
  }

  await db
    .update(sections)
    .set({
      selectedMovement:
        selected === null ? null : serializeSelectedMovement(selected),
    })
    .where(eq(sections.section, section));
}
