import "server-only";

import { getDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { eq } from "drizzle-orm";
import { highestOccupiedTableInSection } from "@/db/games/queries/highest-occupied-table";

/**
 * Delete a section. Rejected when the section still has seated participants —
 * they must be evicted first.
 */
export async function deleteSection(
  gameId: string,
  section: string,
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

  const highest = await highestOccupiedTableInSection(db, section);
  if (highest > 0) {
    throw new Error(
      `Cannot delete section ${section}: it has seated participants. Evict them first.`,
    );
  }

  await db.delete(sections).where(eq(sections.section, section));
}
