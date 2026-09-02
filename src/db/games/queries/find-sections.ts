import { Db } from "@/db/games";
import { sections, Section } from "@/db/games/tables/sections";
import { asc } from "drizzle-orm";

/**
 * List all sections for a game, ordered by display ordinal.
 */
export async function findSections(db: Db): Promise<Section[]> {
  return await db.select().from(sections).orderBy(asc(sections.ordinal));
}
