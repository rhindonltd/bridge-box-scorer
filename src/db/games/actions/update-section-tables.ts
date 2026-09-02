import "server-only";

import { getDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { eq } from "drizzle-orm";
import { highestOccupiedTableInSection } from "@/db/games/queries/highest-occupied-table";

/**
 * Change the number of tables in a section. Growing is always allowed. Shrinking
 * is rejected when a participant is seated at a table beyond the new count — the
 * director must evict them first (mirrors the game-level update-tables guard,
 * now scoped per section).
 */
export async function updateSectionTables(
  gameId: string,
  section: string,
  tables: number,
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

  if (tables < existing.tables) {
    const highest = await highestOccupiedTableInSection(db, section);
    if (highest > tables) {
      throw new Error(
        `Cannot reduce section ${section} to ${tables} tables: table ${highest} has seated participants. Evict them first.`,
      );
    }
  }

  await db
    .update(sections)
    .set({ tables })
    .where(eq(sections.section, section));
}
