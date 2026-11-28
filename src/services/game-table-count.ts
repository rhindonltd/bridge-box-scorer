import "server-only";
import { requireGameDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { updateTableCount } from "@/db/game-index/actions/update-table-count";

/**
 * Copy a game's table count onto its game-index row, where the game lists
 * (Create Game's "Not started yet", Manage Game) read it. The count is the sum
 * of the sections' tables, which live in the game's own database. Call after
 * anything that changes a section's tables: resizing, adding, deleting or
 * splitting a section.
 */
export async function syncGameTableCount(gameId: string): Promise<void> {
  const sections = await findSections(await requireGameDb(gameId));
  await updateTableCount(
    gameId,
    sections.reduce((total, section) => total + section.tables, 0),
  );
}
