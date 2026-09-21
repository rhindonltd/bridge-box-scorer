import "server-only";

import { requireGameDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { eq } from "drizzle-orm";
import { highestOccupiedTableInSection } from "@/db/games/queries/highest-occupied-table";
import { ClientError } from "@/lib/api/client-error";

/**
 * Delete a section. Rejected when the section still has seated participants —
 * they must be evicted first.
 */
export async function deleteSection(
  gameId: string,
  section: string,
): Promise<void> {
  const db = await requireGameDb(gameId);

  const existing = await db
    .select()
    .from(sections)
    .where(eq(sections.section, section))
    .get();

  if (!existing) {
    throw new ClientError(`Section ${section} does not exist`);
  }

  const highest = await highestOccupiedTableInSection(db, section);
  if (highest > 0) {
    throw new ClientError(
      `Cannot delete section ${section}: it has seated participants. Evict them first.`,
    );
  }

  await db.delete(sections).where(eq(sections.section, section));
}
