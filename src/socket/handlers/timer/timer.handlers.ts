import { Server, Socket } from "socket.io";
import { registerNextRoundHandler } from "./next-round.handler";
import { registerPauseTimerHandler } from "./pause-timer.handler";
import { registerStartTimerHandler } from "./start-timer.handler";
import { registerUpdateConfigHandler } from "./update-config.handler";

export function registerTimerHandlers(socket: Socket, io: Server) {
  registerNextRoundHandler(socket, io);
  registerPauseTimerHandler(socket, io);
  registerStartTimerHandler(socket, io);
  registerUpdateConfigHandler(socket, io);
}
