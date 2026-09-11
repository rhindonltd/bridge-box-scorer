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
    registerGameHandlers(socket, requireIO());
    registerTimerHandlers(socket, requireIO());
    registerResultsHandlers(socket, requireIO());
  });

  return io;
}

/**
 * The initialized Socket.IO server, or null if it hasn't started yet.
 *
 * Non-socket code (e.g. HTTP API routes that mutate then broadcast) uses this
 * to reach the live server. It is a module singleton shared across the single
 * custom-server process. Returns null rather than throwing so callers can
 * treat "no live server" (e.g. during a unit test) as a no-op broadcast.
 */
export function getIO(): Server | null {
  return io;
}

/** Internal variant that asserts the server is initialized (connection setup). */
function requireIO(): Server {
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
