import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { parseSeat } from "@/model/participants";

/**
 * The highest table number that has a seated participant within a section.
 * Returns 0 when the section has no seated participants. Used to guard against
 * shrinking or deleting a section out from under seated pairs.
 */
export async function highestOccupiedTableInSection(
  db: Db,
  section: string,
): Promise<number> {
  const pairs = await findPairs(db);

  const tablesInSection = pairs
    .map((p) => parseSeat(p.initialSeat))
    .filter((s) => s.section === section)
    .map((s) => s.tableNumber);

  if (tablesInSection.length === 0) return 0;

  return Math.max(...tablesInSection);
}
