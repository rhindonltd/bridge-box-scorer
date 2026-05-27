import { Direction, PairDirection } from "@/model/common";

import { getDb } from "@/db/games/pairs";
import { initialSeat } from "@/db/games/shared/tables/initial-seat";
import { players } from "@/db/games/shared/tables/players";
import { eq } from "drizzle-orm";
import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";

export async function findPairInitialSeats(
  gameId: string,
): Promise<PairInitialSeat[]> {
  const db = await getDb(gameId);

  const playerInitialSeats: PlayerInitialSeat[] = await db
    .select({
      tableNumber: initialSeat.tableNumber,
      direction: initialSeat.direction,
      player: {
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        nationalId: players.nationalId,
      },
    })
    .from(initialSeat)
    .innerJoin(players, eq(initialSeat.player, players.id));

  return pairInitialSeats(playerInitialSeats);
}

function pairInitialSeats(
  playerInitialSeats: PlayerInitialSeat[],
): PairInitialSeat[] {
  const grouped = new Map<
    number,
    Partial<Record<Direction, PlayerInitialSeat>>
  >();

  // Group by table
  for (const entry of playerInitialSeats) {
    if (!grouped.has(entry.tableNumber)) {
      grouped.set(entry.tableNumber, {});
    }

    grouped.get(entry.tableNumber)![entry.direction] = entry;
  }

  const assignedPairs: PairInitialSeat[] = [];

  for (const [tableNumber, directions] of grouped) {
    if (directions.N && directions.S) {
      assignedPairs.push({
        tableNumber,
        direction: "NS",
        pair: {
          player1: directions.N.player,
          player2: directions.S.player,
        },
      });
    }

    if (directions.E && directions.W) {
      assignedPairs.push({
        tableNumber,
        direction: "EW",
        pair: {
          player1: directions.E.player,
          player2: directions.W.player,
        },
      });
    }
  }

  return assignedPairs;
}

export type PairInitialSeat = {
  tableNumber: number;
  direction: PairDirection;
  pair: {
    player1: {
      firstName: string;
      lastName: string;
      nationalId: string | null;
    };
    player2: {
      firstName: string;
      lastName: string;
      nationalId: string | null;
    };
  };
};
