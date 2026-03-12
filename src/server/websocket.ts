import { Server } from "socket.io";
import http from "http";
import { BridgeEvent } from "@/db/schema";
import { isDirector } from "@/db/queries/login-sessions";
import { createBridgeEvent } from "@/db/actions/create-bridge-event";
import { startBridgeSection } from "@/db/actions/start-bridge-section";

export function startSocketServer(server: http.Server) {
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    socket.data.isDirector = isDirector(socket.handshake.auth.token);
    next();
  });

  io.on("connection", (socket) => {
    console.log("client connected", socket.id);

    // player:joinTable
    // player:submitScore
    // player:confirmScore
    // player:readyNextRound

    // director:startRound
    // director:endRound
    // director:adjustScore
    // director:skipBoard
    // director:endSession

    // event:created
    // table:scoreUpdate
    // table:boardComplete
    // round:started
    // round:ended
    // movement:update

    socket.on("joinTable", (tableId) => {
      socket.join(`table:${tableId}`);
    });

    // DIRECTOR EVENTS
    socket.on("director:createEvent", (event: BridgeEvent) => {
      if (!socket.data.isDirector) {
        return;
      }

      createBridgeEvent(event).then(() => {
        io.emit("event:created", event);
      })
    });

    socket.on("director:startSession", (sectionId: string) => {
      if (!socket.data.isDirector) {
        return;
      }

      startBridgeSection(sectionId).then(() => {
        io.emit("session:started");
      })
    });

    socket.on("director:startRound", () => {
      if (!socket.data.isDirector) {
        return;
      }
      io.emit("round:started");
    });
  });

  return io;
}
