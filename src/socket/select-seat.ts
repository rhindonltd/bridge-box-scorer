import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";
import {
  findStartingPositions,
  StartingPositionWithPlayer,
} from "@/db/games/shared/queries/find-starting-positions";
import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createStartingPosition } from "@/db/games/shared/actions/create-starting-position";
import { Rooms } from "./rooms";

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

        const startingPositions = await findStartingPositions(gameId);

        io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
          startingPositions,
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(
          "Failed to create starting position " +
            JSON.stringify(startingPositionWithPlayer) +
            " for game " +
            gameId,
        );
        cb?.({ success: false });
      }
    },
  );
}
