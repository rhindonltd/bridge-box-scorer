import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { setSelectedMovement } from "@/db/game-index/actions/set-selected-movement";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { SelectedMovement } from "@/model/selected-movement";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";

// The movement is either a Mitchell spec (validated downstream) or a stored
// spec id + boardsPerRound. `mitchell` is kept as a passthrough object; its
// detailed shape is validated where it is consumed.
const payloadSchema = z.object({
  gameId: z.string().min(1),
  type: z.string().optional(),
  id: z.number().int().optional(),
  boardsPerRound: z.number().int().positive().optional(),
  mitchell: z.custom<MitchellMovementSpec>().optional(),
  directorToken: z.string().min(1),
});

/**
 * Selecting a movement no longer materializes boards/assignments. It persists
 * the chosen movement on the game row so the director can freely change their
 * mind before the game starts. Boards/assignments are generated only when the
 * game is started (see the start-game handler), at which point seating is
 * validated and any sit-out transformation is applied.
 */
export function registerSelectMovementHandler(socket: Socket, io: Server) {
  registerHandler(socket, io, SocketEvents.SELECT_MOVEMENT, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, id, boardsPerRound, mitchell, directorToken } = payload;
      if (!validateDirectorToken(directorToken, gameId)) {
        throw new HandlerError("Unauthorized");
      }

      let selected: SelectedMovement;

      if (mitchell) {
        selected = { source: "MITCHELL", mitchell };
      } else if (id != null) {
        if (boardsPerRound == null) {
          throw new HandlerError("No boards per round specified");
        }
        selected = { source: "SPEC", specId: id, boardsPerRound };
      } else {
        throw new HandlerError("No movement specified");
      }

      await setSelectedMovement(gameId, selected);

      const updatedGame = await findGameById(gameId);
      io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
        game: updatedGame,
      });

      ack({ success: true, data: undefined });
    },
  });
}
