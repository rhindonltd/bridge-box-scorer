import { Server, Socket } from "socket.io";

import { registerNextRoundHandler } from "./next-round.handler";
import { registerPauseTimerHandler } from "./pause-timer.handler";
import { registerStartTimerHandler } from "./start-timer.handler";
import { registerUpdateConfigHandler } from "./update-config.handler";
import { registerPreviousHandler } from "./previous.handler";
import { registerAdjustTimeHandler } from "./adjust-time.handler";
import { registerRequestStateHandler } from "./request-state.handler";

// NOTE: two timer mutations are NOT socket events:
// - Saving a timer configuration during setup is an HTTP route (PUT
//   /api/games/[gameId]/sections/[section]/timer/config); it persists the
//   "configured but not started" state and broadcasts `timer:sync`.
// - Creating a live timer ad hoc no longer exists: a timer comes to life only
//   via `promoteTimerAtGameStart` when the game is started, which builds the
//   engine, starts it, and schedules its phases.
// The live timer controls below (start/pause/next/previous/adjust/update-config)
// stay on the socket.
export function registerTimerHandlers(socket: Socket, io: Server) {
  registerNextRoundHandler(socket, io);
  registerPauseTimerHandler(socket, io);
  registerStartTimerHandler(socket, io);
  registerUpdateConfigHandler(socket, io);
  registerPreviousHandler(socket, io);
  registerAdjustTimeHandler(socket, io);
  registerRequestStateHandler(socket, io);
}
