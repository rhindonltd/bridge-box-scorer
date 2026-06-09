import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

import { createPlayer } from "@/db/games/shared/actions/create-player";

import { createInitialSeat } from "@/db/games/shared/actions/create-initial-seat";
import {
  PlayerInitialSeat,
  findPlayerInitialSeats,
} from "@/db/games/shared/queries/find-player-initial-seats";

export function registerSelectSeatHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SELECT_SEAT,
    async (
      {
        gameId,
        playerInitialSeat,
      }: {
        gameId: string;
        playerInitialSeat: PlayerInitialSeat;
      },
      cb,
    ) => {
      try {
        const playerId = (
          await createPlayer("INDIVIDUAL", gameId, playerInitialSeat.player)
        ).id;

        await createInitialSeat("INDIVIDUAL", gameId, {
          tableNumber: playerInitialSeat.tableNumber,
          direction: playerInitialSeat.direction,
          player: playerId,
        });

        io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
          startingPositions: await findPlayerInitialSeats(gameId),
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(
          `Failed to create starting position for game ${gameId}`,
          err,
        );

        cb?.({
          success: false,
        });
      }
    },
  );
}
