import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";
import { GameType } from "@/db/games/types/game-type";
import { createLoginSession } from "@/db/system/actions/create-login-session";

/**
 * Anyone can create a game. The creator automatically becomes the director
 * for that game — a login session is created and the token is returned so
 * the client can store it as a cookie for subsequent director-only operations.
 */
export function registerCreateGameHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_GAME,
    async (newBridgeGame: NewBridgeGame, cb) => {
      try {
        const bridgeGame: BridgeGame = await createBridgeGame(newBridgeGame);
        await createGameDb(bridgeGame.gameId, bridgeGame.gameType as GameType);

        // Automatically make the creator a director
        const directorToken = crypto.randomUUID();
        await createLoginSession({
          token: directorToken,
          gameId: bridgeGame.gameId,
          role: "DIRECTOR",
        });

        // Return the director token so the client can store it in localStorage
        cb({
          data: { game: bridgeGame, directorToken },
          success: true,
        });

        io.emit(SocketEvents.JOINABLE_GAMES, {
          joinableGames: await findJoinableGames(),
        });
      } catch (error) {
        console.error("Failed to create game:", error);
        cb({ error: error instanceof Error ? error.message : "Unknown error", success: false });
      }
    },
  );
}
