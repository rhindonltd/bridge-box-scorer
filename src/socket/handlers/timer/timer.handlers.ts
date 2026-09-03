import { Server, Socket } from "socket.io";

import { registerCreateTimerHandler } from "./create-timer.handler";
import { registerNextRoundHandler } from "./next-round.handler";
import { registerPauseTimerHandler } from "./pause-timer.handler";
import { registerStartTimerHandler } from "./start-timer.handler";
import { registerUpdateConfigHandler } from "./update-config.handler";
import { registerPreviousHandler } from "./previous.handler";
import { registerAdjustTimeHandler } from "./adjust-time.handler";

export function registerTimerHandlers(socket: Socket, io: Server) {
  registerCreateTimerHandler(socket, io);
  registerNextRoundHandler(socket, io);
  registerPauseTimerHandler(socket, io);
  registerStartTimerHandler(socket, io);
  registerUpdateConfigHandler(socket, io);
  registerPreviousHandler(socket, io);
  registerAdjustTimeHandler(socket, io);
}
