import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createPair } from "@/db/games/pairs/actions/create-pair";
import { createStartingPosition } from "@/db/games/shared/actions/create-starting-position";
import { Rooms } from "./rooms";
import {
  findPairStartingPositions,
  PairStartingPosition,
} from "@/db/games/pairs/queries/find-pair-starting-positions";

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

      await createStartingPosition("PAIRS", gameId, {
        tableNumber: pairStartingPosition.tableNumber,
        direction: pairStartingPosition.direction == "NS" ? "N" : "E",
        player: player1,
      });

      await createStartingPosition("PAIRS", gameId, {
        tableNumber: pairStartingPosition.tableNumber,
        direction: pairStartingPosition.direction == "NS" ? "S" : "W",
        player: player1,
      });

      io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
        startingPositions: await findPairStartingPositions(gameId),
      });

      cb?.({ success: true });
    },
  );
}
