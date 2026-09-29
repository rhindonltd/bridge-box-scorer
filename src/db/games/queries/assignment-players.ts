import { Db } from "@/db/games";
import { assignments as pairAssignments } from "@/db/games/tables/assignments";
import { participants as pairParticipants } from "@/db/games/tables/participants";
import { players } from "@/db/games/tables/players";
import type { Player } from "@/db/games/tables/players";

/** The two players seated as one pair. */
export type PairPlayers = { player1: Player; player2: Player };

/**
 * Build a map from assignment id to the two players sitting at that
 * assignment's initial seat.
 *
 * Joins assignments → initialSeat → participant pair → player rows: an
 * assignment's `initialSeat` is the seat the pair was seated at, and the
 * participant row for that seat names the two players. This is the single
 * source used to turn a board row's `ns`/`ew` assignment id into player names,
 * shared by the player schedule and the Swiss draw preview.
 */
export async function buildAssignmentPlayerLookup(
  db: Db,
): Promise<Map<string, PairPlayers>> {
  const allAssignmentRows = await db.select().from(pairAssignments);
  const allParticipantRows = await db.select().from(pairParticipants);
  const allPlayerRows = await db.select().from(players);

  const playerById = new Map(allPlayerRows.map((p) => [p.id, p]));

  // initialSeat -> { player1, player2 }
  const seatToPlayers = new Map<string, PairPlayers>();
  for (const p of allParticipantRows) {
    const p1 = playerById.get(p.player1);
    const p2 = playerById.get(p.player2);
    if (p1 && p2 && p.initialSeat) {
      seatToPlayers.set(p.initialSeat, { player1: p1, player2: p2 });
    }
  }

  // assignment id -> { player1, player2 } (via the assignment's initial seat)
  const assignmentToPlayers = new Map<string, PairPlayers>();
  for (const a of allAssignmentRows) {
    const playersForSeat = a.initialSeat
      ? seatToPlayers.get(a.initialSeat)
      : undefined;
    if (playersForSeat) {
      assignmentToPlayers.set(a.id, playersForSeat);
    }
  }

  return assignmentToPlayers;
}
