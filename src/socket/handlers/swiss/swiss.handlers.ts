import { Server, Socket } from "socket.io";

import { registerDrawNextRoundHandler } from "./draw-next-round.handler";

/**
 * Register the Swiss Pairs socket handlers. Swiss is the one movement whose
 * schedule is drawn live: the director draws each round after the previous one
 * is scored, so its only socket event is the director-initiated draw.
 */
export function registerSwissHandlers(socket: Socket, io: Server) {
  registerDrawNextRoundHandler(socket, io);
}
