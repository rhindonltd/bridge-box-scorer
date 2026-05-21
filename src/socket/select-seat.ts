import { Server, Socket } from "socket.io";

import { SocketEvents } from "./socket-events";
import { Rooms } from "./rooms";

import {
  findStartingPositions,
  StartingPositionWithPlayer,
} from "@/db/games/shared/queries/find-starting-positions";

import { createPlayer } from "@/db/games/shared/actions/create-player";

import { createStartingPosition } from "@/db/games/shared/actions/create-starting-position";

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

        const startingPositions = await findStartingPositions(gameId);

        io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
          startingPositions,
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
