import "server-only";

import { getDb } from "@/db/games";
import { NewPlayer, players } from "@/db/games/tables/players";
import { participants } from "@/db/games/tables/participants";
import { teams } from "@/db/games/tables/teams";
import { deriveTeamId, parseSeat, PairSeat } from "@/model/participants";

/**
 * Create a seated pair and its two player rows in a single transaction, so a
 * failure to insert the participant row can never leave the two player rows
 * orphaned. Returns nothing; the caller already holds the seat's secret key.
 *
 * `teamName` is only meaningful for a Teams event and only for the home (NS)
 * pair, since a team is identified by its home table (see `deriveTeamId`). When
 * an NS pair is seated with a non-blank name, a `teams` row is upserted for the
 * team id. A blank/omitted name writes no team row, leaving the read-time
 * default (the North player's surname) in effect. Any name passed for a
 * non-NS seat is ignored defensively.
 */
export async function createPairWithPlayers(
  gameId: string,
  data: {
    initialSeat: PairSeat;
    player1: NewPlayer;
    player2: NewPlayer;
    secretKey: string;
    teamName?: string | null;
  },
): Promise<void> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  // A team name only applies to the home (NS) pair; trim and drop when blank so
  // the read-time surname fallback stays in effect.
  const trimmedTeamName = data.teamName?.trim() || null;
  const isNsSeat = parseSeat(data.initialSeat).direction === "NS";
  const teamName = isNsSeat ? trimmedTeamName : null;

  db.transaction((tx) => {
    const p1 = tx.insert(players).values(data.player1).returning().get();
    const p2 = tx.insert(players).values(data.player2).returning().get();

    tx.insert(participants)
      .values({
        initialSeat: data.initialSeat,
        player1: p1.id,
        player2: p2.id,
        secretKey: data.secretKey,
      })
      .run();

    if (teamName !== null) {
      const teamId = deriveTeamId(data.initialSeat);
      tx.insert(teams)
        .values({ teamId, teamName })
        .onConflictDoUpdate({ target: teams.teamId, set: { teamName } })
        .run();
    }
  });
}
