import { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { participants } from "@/db/games/tables/participants";
import { alias } from "drizzle-orm/sqlite-core";
import { eq } from "drizzle-orm";

/**
 * The set of EBU/national IDs currently seated in a game (across every table
 * and section). Only players actually attached to a participant row are
 * counted, and guests (null `nationalId`) are excluded — they can never be a
 * duplicate.
 *
 * Used to reject seating a player whose EBU number is already in play: one
 * person can only occupy a single position in an event.
 */
export async function findSeatedNationalIds(db: Db): Promise<Set<string>> {
  const player1 = alias(players, "p1");
  const player2 = alias(players, "p2");

  const rows = await db
    .select({
      id1: player1.nationalId,
      id2: player2.nationalId,
    })
    .from(participants)
    .innerJoin(player1, eq(participants.player1, player1.id))
    .innerJoin(player2, eq(participants.player2, player2.id));

  const seated = new Set<string>();
  for (const row of rows) {
    if (row.id1) seated.add(row.id1);
    if (row.id2) seated.add(row.id2);
  }
  return seated;
}
