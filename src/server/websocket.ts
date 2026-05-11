import { Server } from "socket.io";
import http from "http";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { NewBridgeGame } from "@/db/game-index/schema";
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

    socket.on("game:create", async (game: NewBridgeGame, cb) => {
      try {
        const gameId = await createBridgeGame(game);
        cb({ gameId }); // ack back to client

        await createGameDb(gameId, game.eventType as EventType);

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
