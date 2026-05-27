import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createPair } from "@/db/games/pairs/actions/create-pair";
import { createInitialSeat } from "@/db/games/shared/actions/create-initial-seat";
import { Rooms } from "./rooms";
import {
  findPairInitialSeats,
  PairStartingPosition,
} from "@/db/games/pairs/queries/find-pair-initial-seats";

export function registerCreatePairHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_PAIR,
    async (
      {
        gameId,
        pairStartingPosition,
      }: { gameId: string; pairStartingPosition: PairStartingPosition },
      cb,
    ) => {
      const player1 = (
        await createPlayer("PAIRS", gameId, pairStartingPosition.pair.player1)
      ).id;
      const player2 = (
        await createPlayer("PAIRS", gameId, pairStartingPosition.pair.player2)
      ).id;

      await createPair(gameId, { player1, player2 });

      await createInitialSeat("PAIRS", gameId, {
        tableNumber: pairStartingPosition.tableNumber,
        direction: pairStartingPosition.direction == "NS" ? "N" : "E",
        player: player1,
      });

      await createInitialSeat("PAIRS", gameId, {
        tableNumber: pairStartingPosition.tableNumber,
        direction: pairStartingPosition.direction == "NS" ? "S" : "W",
        player: player2,
      });

      io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
        startingPositions: await findPairInitialSeats(gameId),
      });

      cb?.({ success: true });
    },
  );
}
