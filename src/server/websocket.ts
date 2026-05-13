import { Server } from "socket.io";
import http from "http";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { createGameDb } from "@/db/games/actions/create-game";
import { findJoinableGames } from "../db/game-index/queries";
import { EventType } from "@/components/create/SimpleCreateGameForm";

let io: Server | null = null;

export function startSocketServer(server: http.Server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("connected", socket.id);

    socket.on("game:create", async (newBridgeGame: NewBridgeGame, cb) => {
      try {
        const bridgeGame: BridgeGame = await createBridgeGame(newBridgeGame);
        await createGameDb(
          bridgeGame.gameId,
          bridgeGame.eventType as EventType,
        );

        cb({ game: bridgeGame });

        getIO().emit("joinable-games", await findJoinableGames());
      } catch (err) {
        socket.emit("game:error", "Failed to create game");
      }
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
}
