import "server-only";
import { requireGameDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import {
  parseSelectedMovement,
  type SelectedMovement,
} from "@/model/selected-movement";

/**
 * Clear every section's selected movement, for when the game's event type or
 * scoring changes and the movements chosen may no longer fit. Returns each
 * section that had a movement, with the movement it had, so the caller can
 * reset that section's timer and tell its devices.
 */
export async function clearSectionMovements(
  gameId: string,
): Promise<{ section: string; previous: SelectedMovement }[]> {
  const cleared: { section: string; previous: SelectedMovement }[] = [];
  for (const { section, selectedMovement } of await findSections(
    await requireGameDb(gameId),
  )) {
    const previous = parseSelectedMovement(selectedMovement);
    if (previous == null) continue;
    await setSectionMovement(gameId, section, null);
    cleared.push({ section, previous });
  }
  return cleared;
}
