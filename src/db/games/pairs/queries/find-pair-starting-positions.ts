import { Direction, PairDirection } from "@/model/common";

import { getDb } from "@/db/games/pairs";
import { startingpositions } from "@/db/games/shared/tables/starting-positions";
import { players } from "@/db/games/shared/tables/players";
import { eq } from "drizzle-orm";
import { PlayerStartingPosition } from "@/db/games/shared/queries/find-player-starting-positions";

export async function findPairStartingPositions(
  gameId: string,
): Promise<PairStartingPosition[]> {
  const db = await getDb(gameId);

  const playerStartingPositions: PlayerStartingPosition[] = await db
    .select({
      tableNumber: startingpositions.tableNumber,
      direction: startingpositions.direction,
      player: {
        id: players.id,
        firstName: players.firstName,
        lastName: players.lastName,
        nationalId: players.nationalId,
      },
    })
    .from(startingpositions)
    .innerJoin(players, eq(startingpositions.player, players.id));

  return pairStartingPositions(playerStartingPositions);
}

function pairStartingPositions(
  playerStartingPositions: PlayerStartingPosition[],
): PairStartingPosition[] {
  const grouped = new Map<
    number,
    Partial<Record<Direction, PlayerStartingPosition>>
  >();

  // Group by table
  for (const entry of playerStartingPositions) {
    if (!grouped.has(entry.tableNumber)) {
      grouped.set(entry.tableNumber, {});
    }

    grouped.get(entry.tableNumber)![entry.direction] = entry;
  }

  const assignedPairs: PairStartingPosition[] = [];

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

export type PairStartingPosition = {
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
