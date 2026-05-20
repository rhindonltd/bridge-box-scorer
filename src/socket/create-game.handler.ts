import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";
import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { EventType } from "@/components/create/SimpleCreateGameForm";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";

export function registerCreateGameHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_GAME,
    async (newBridgeGame: NewBridgeGame, cb) => {
      try {
        const bridgeGame: BridgeGame = await createBridgeGame(newBridgeGame);
        await createGameDb(
          bridgeGame.gameId,
          bridgeGame.eventType as EventType,
        );

        cb({ game: bridgeGame, success: true });

        io.emit(SocketEvents.JOINABLE_GAMES, await findJoinableGames());
      } catch (err) {
        cb({ success: false });
      }
    },
  );
}
