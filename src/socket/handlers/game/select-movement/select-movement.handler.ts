import type { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

import { assertDirector } from "@/socket/middleware/director-auth";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { setSelectedMovement } from "@/db/game-index/actions/set-selected-movement";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { SelectedMovement } from "@/model/selected-movement";

/**
 * Selecting a movement no longer materializes boards/assignments. It persists
 * the chosen movement on the game row so the director can freely change their
 * mind before the game starts. Boards/assignments are generated only when the
 * game is started (see the start-game handler), at which point seating is
 * validated and any sit-out transformation is applied.
 */
export function registerSelectMovementHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SELECT_MOVEMENT,
    async (
      {
        gameId,
        id,
        boardsPerRound,
        mitchell,
        directorToken,
      }: {
        gameId: string;
        type?: string;
        id?: number;
        boardsPerRound?: number;
        mitchell?: MitchellMovementSpec;
        directorToken: string;
      },
      cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        let selected: SelectedMovement;

        if (mitchell) {
          selected = { source: "MITCHELL", mitchell };
        } else if (id != null) {
          if (boardsPerRound == null) {
            cb?.({ success: false, error: "No boards per round specified" });
            return;
          }
          selected = { source: "SPEC", specId: id, boardsPerRound };
        } else {
          cb?.({ success: false, error: "No movement specified" });
          return;
        }

        await setSelectedMovement(gameId, selected);

        const updatedGame = await findGameById(gameId);
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
          game: updatedGame,
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(err);
        cb?.({ success: false });
      }
    },
  );
}
