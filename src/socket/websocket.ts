import { Server } from "socket.io";
import http from "http";
import { registerGameHandlers } from "@/socket/handlers/game/game.handlers";
import { registerTimerHandlers } from "./handlers/timer/timer.handlers";
import { registerResultsHandlers } from "./handlers/results/results.handlers";

// The Socket.IO server is stored on `globalThis`, NOT a module-level variable.
//
// The app runs as two separate bundles that each get their own copy of this
// module: the custom server (`server.ts` → `dist/server.js`, which calls
// `startSocketServer`) and the Next.js route handlers (`.next/server`, which
// call `getIO()` to broadcast after an HTTP mutation). A module-level `let`
// would live once per bundle, so a route handler would never see the instance
// the server created and every HTTP-route broadcast would silently no-op.
// `globalThis` is process-wide and shared across both bundles, so the single
// running process has one shared instance.
const IO_KEY = "__bridgeBoxIO" as const;

type IOGlobal = typeof globalThis & { [IO_KEY]?: Server | null };

function getStoredIO(): Server | null {
  return (globalThis as IOGlobal)[IO_KEY] ?? null;
}

function setStoredIO(server: Server | null): void {
  (globalThis as IOGlobal)[IO_KEY] = server;
}

export function startSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    },
  });
  setStoredIO(io);

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
 * to reach the live server. It reads from a process-wide `globalThis` slot so
 * it works across the separate server / Next.js bundles (see note above).
 * Returns null rather than throwing so callers can treat "no live server"
 * (e.g. in a unit test) as a no-op broadcast.
 */
export function getIO(): Server | null {
  return getStoredIO();
}

/** Internal variant that asserts the server is initialized (connection setup). */
function requireIO(): Server {
  const io = getStoredIO();
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
    const io = getStoredIO();
    if (!io) {
      resolve();
      return;
    }
    io.close(() => {
      setStoredIO(null);
      resolve();
    });
  });
}
