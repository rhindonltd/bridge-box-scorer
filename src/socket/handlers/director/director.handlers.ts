import { Server, Socket } from "socket.io";
import { registerDirectorWatchHandler } from "./director-watch.handler";
import { registerAnswerCallHandler } from "./answer-call.handler";

export function registerDirectorHandlers(socket: Socket, io: Server) {
  registerDirectorWatchHandler(socket, io);
  registerAnswerCallHandler(socket, io);
}
