import { Server, Socket } from "socket.io";

import { registerDrawNextRoundHandler } from "./draw-next-round.handler";
import { registerDrawNextTeamsRoundHandler } from "./draw-next-teams-round.handler";

/**
 * Register the Swiss socket handlers. Swiss (Pairs and Teams) is the movement
 * family whose schedule is drawn live: the director draws each round after the
 * previous one is scored, so each has a director-initiated draw event.
 */
export function registerSwissHandlers(socket: Socket, io: Server) {
  registerDrawNextRoundHandler(socket, io);
  registerDrawNextTeamsRoundHandler(socket, io);
}
