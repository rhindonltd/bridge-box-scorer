import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";
import { GameType } from "@/db/games/types/game-type";

export function registerCreateGameHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_GAME,
    async (newBridgeGame: NewBridgeGame, cb) => {
      try {
        const bridgeGame: BridgeGame = await createBridgeGame(newBridgeGame);
        await createGameDb(bridgeGame.gameId, bridgeGame.gameType as GameType);

        cb({ data: { game: bridgeGame }, success: true });

        io.emit(SocketEvents.JOINABLE_GAMES, {
          joinableGames: await findJoinableGames(),
        });
      } catch (error) {
        cb({ error, success: false });
      }
    },
  );
}
