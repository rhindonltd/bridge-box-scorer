import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";
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
        startingPositionWithPlayer,
      }: {
        gameId: string;
        startingPositionWithPlayer: StartingPositionWithPlayer;
      },
      cb,
    ) => {
      try {
        const playerId = (
          await createPlayer(gameId, startingPositionWithPlayer.player)
        ).id;
        await createStartingPosition(gameId, {
          tableNumber: startingPositionWithPlayer.tableNumber,
          direction: startingPositionWithPlayer.direction,
          player: playerId,
        });

        io.to(gameId).emit(SocketEvents.STARTING_POSITIONS, {
          startingPositions: findStartingPositions(gameId),
        });

        cb?.({ success: true });
      } catch (err) {
        cb?.({ success: false });
      }
    },
  );
}
