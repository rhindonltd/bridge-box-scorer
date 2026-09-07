import { Server } from "socket.io";
import http from "http";
import { registerGameHandlers } from "@/socket/handlers/game/game.handlers";
import { registerTimerHandlers } from "./handlers/timer/timer.handlers";
import { registerResultsHandlers } from "./handlers/results/results.handlers";

let io: Server | null = null;

export function startSocketServer(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    },
  });

  io.on("connection", (socket) => {
    registerGameHandlers(socket, getIO());
    registerTimerHandlers(socket, getIO());
    registerResultsHandlers(socket, getIO());
  });

  return io;
}

function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
}

/**
 * Close the Socket.IO server (disconnecting all clients) as part of graceful
 * shutdown. Resolves once the server has fully closed. Safe to call when the
 * server was never started.
 */
export function closeSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }
    io.close(() => {
      io = null;
      resolve();
    });
  });
}
