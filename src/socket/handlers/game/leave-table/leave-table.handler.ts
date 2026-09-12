import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { deleteParticipant } from "@/db/games/actions/delete-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { PairSeat } from "@/model/participants";

/**
 * LEAVE_TABLE — a seated player vacates their seat before the game starts,
 * freeing it for someone else.
 *
 * Player-authed: the caller must present the seat's own token (validated
 * against the participant's stored secret). Setup-only: once the game has
 * started (its movement is materialized), seating is fixed and leaving is
 * refused. On success the participant + its player rows are removed and the
 * updated participant list is broadcast, so every join screen shows the seat as
 * free again.
 */
export function registerLeaveTableHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.LEAVE_TABLE,
    async (
      {
        gameId,
        seat,
        token,
      }: { gameId: string; seat: string; token?: string },
      cb?: (res: { success: boolean; error?: string }) => void,
    ) => {
      if (!(await assertPlayer(gameId, seat, token, cb))) {
        return;
      }

      try {
        if (await isGameStarted(gameId)) {
          cb?.({
            success: false,
            error:
              "The game has already started; you can no longer leave your seat.",
          });
          return;
        }

        await deleteParticipant(gameId, seat as PairSeat);
        await broadcastParticipants(gameId, io);
        cb?.({ success: true });
      } catch (err) {
        console.error(
          `Failed to leave table at seat ${seat} in game ${gameId}`,
          err,
        );
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );
}
