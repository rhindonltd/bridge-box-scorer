import { Server } from "socket.io";
import http from "http";
import { registerGameHandlers } from "@/socket/handlers/game/game.handlers";

let io: Server | null = null;

export function startSocketServer(server: http.Server) {
  io = new Server(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    registerGameHandlers(socket, getIO());
  });

  return io;
}

function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }

  return io;
}
