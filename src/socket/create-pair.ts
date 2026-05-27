import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createPair } from "@/db/games/pairs/actions/create-pair";
import { createInitialSeat } from "@/db/games/shared/actions/create-initial-seat";
import { Rooms } from "./rooms";
import {
  findPairInitialSeats,
  PairInitialSeat,
} from "@/db/games/pairs/queries/find-pair-initial-seats";

export function registerCreatePairHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_PAIR,
    async (
      {
        gameId,
        pairInitialSeat,
      }: { gameId: string; pairInitialSeat: PairInitialSeat },
      cb,
    ) => {
      const player1 = (
        await createPlayer("PAIRS", gameId, pairInitialSeat.pair.player1)
      ).id;
      const player2 = (
        await createPlayer("PAIRS", gameId, pairInitialSeat.pair.player2)
      ).id;

      await createPair(gameId, { player1, player2 });

      await createInitialSeat("PAIRS", gameId, {
        tableNumber: pairInitialSeat.tableNumber,
        direction: pairInitialSeat.direction == "NS" ? "N" : "E",
        player: player1,
      });

      await createInitialSeat("PAIRS", gameId, {
        tableNumber: pairInitialSeat.tableNumber,
        direction: pairInitialSeat.direction == "NS" ? "S" : "W",
        player: player2,
      });

      io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
        startingPositions: await findPairInitialSeats(gameId),
      });

      cb?.({ success: true });
    },
  );
}
