import { Server, Socket } from "socket.io";

import { SocketEvents } from "./socket-events";
import { Rooms } from "./rooms";

import { findStartingPositions } from "@/db/games/shared/queries/find-starting-positions";

import { createPlayer } from "@/db/games/shared/actions/create-player";

import { createStartingPosition } from "@/db/games/shared/actions/create-starting-position";
import { Direction, PairDirection } from "@/model/common";
import { StartingPosition } from "@/db/games/shared/tables/starting-positions";
import { StartingPositionWithPlayer } from "@/db/games/shared/queries/find-starting-positions-with-player";
import { findStartingPositionsWithPlayer } from "../db/games/shared/queries/find-starting-positions-with-player";
import { createPair } from "../db/games/pairs/actions/create-pair";
import { getDb } from "@/db/games";
import { sql } from "drizzle-orm";

export function registerSelectSeatHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SELECT_SEAT,
    async (
      {
        gameId,
        startingPositionsWithPlayer,
      }: {
        gameId: string;
        startingPositionsWithPlayer: StartingPositionWithPlayer[];
      },
      cb,
    ) => {
      try {
        for (const it of startingPositionsWithPlayer) {
          const playerId = (await createPlayer(gameId, it.player)).id;

          await createStartingPosition(gameId, {
            tableNumber: it.tableNumber,
            direction: it.direction,
            player: playerId,
          });
        }

        // const result = (await getDb(gameId)).run(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='pairs'`);

        const rows = (await getDb(gameId)).all(sql`SELECT name
                                                     FROM sqlite_master
                                                     WHERE type = 'table'
                                                       AND name = 'pairs'`);

        if (rows.length > 0) {
          assignedPairs(await findStartingPositions(gameId)).forEach((it) => {
            createPair(gameId, {
              player1: it.player1,
              player2: it.player2,
            });
          });
        }

        io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
          startingPositions: await findStartingPositionsWithPlayer(gameId),
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(
          `Failed to create starting positions for game ${gameId}`,
          err,
        );

        cb?.({
          success: false,
        });
      }
    },
  );
}

interface AssignedPairs {
  tableNumber: number;
  pairDirection: PairDirection;
  player1: number;
  player2: number;
}

function assignedPairs(startingPositions: StartingPosition[]): AssignedPairs[] {
  if (!startingPositions) {
    return [];
  }

  const grouped = new Map<number, Partial<Record<Direction, number>>>();

  // Group by table
  for (const entry of startingPositions) {
    if (!grouped.has(entry.tableNumber)) {
      grouped.set(entry.tableNumber, {});
    }

    grouped.get(entry.tableNumber)![entry.direction] = entry.player;
  }

  const assignedPairs: AssignedPairs[] = [];

  for (const [tableNumber, directions] of grouped) {
    if (directions.N && directions.S) {
      assignedPairs.push({
        tableNumber,
        pairDirection: "NS",
        player1: directions.N,
        player2: directions.S,
      });
    }

    if (directions.E && directions.W) {
      assignedPairs.push({
        tableNumber,
        pairDirection: "EW",
        player1: directions.E,
        player2: directions.W,
      });
    }
  }

  return assignedPairs;
}
