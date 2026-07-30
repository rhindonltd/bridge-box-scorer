import { Server } from "socket.io";
import http from "http";
import { registerGameHandlers } from "@/socket/handlers/game/game.handlers";
import { registerTimerHandlers } from "./handlers/timer/timer.handlers";

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
  });

  return io;
}

function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
}
