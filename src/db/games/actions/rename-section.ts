import "server-only";

import { requireGameDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";
import { eq } from "drizzle-orm";
import { ClientError } from "@/lib/api/client-error";

/**
 * Update a section's display label. The section letter (primary key) is not
 * changed, so seats and board rows keyed by it stay valid.
 */
export async function renameSection(
  gameId: string,
  section: string,
  label: string,
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

  await db
    .update(sections)
    .set({ label })
    .where(eq(sections.section, section));
}
