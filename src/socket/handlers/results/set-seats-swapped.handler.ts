import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { setBoardSeatsSwapped } from "@/db/games/actions/set-board-result";
import {
  registerDirectorBoardRuling,
  directorRulingSchema,
} from "./director-board-ruling";

const payloadSchema = directorRulingSchema({
  // Explicit target state (not a toggle) so a repeated or racing request is
  // idempotent.
  swapped: z.boolean(),
  // Sections can share table numbers; when the client knows the section it
  // scopes the write to that section's board row.
  section: z.string().min(1).optional(),
});

/**
 * Director-authed ruling that a single board instance was played the wrong way
 * round (arrows not switched). Sets or clears `boards.seatsSwapped` only; the
 * result and status are untouched. Readers swap the credited pairs via
 * `applySeatSwaps`. Fans out recomputed leaderboard / traveller snapshots via
 * the shared occupancy-gated broadcaster so every viewer updates live.
 */
export function registerSetSeatsSwappedHandler(socket: Socket, io: Server) {
  registerDirectorBoardRuling(socket, io, {
    event: SocketEvents.SET_SEATS_SWAPPED_TRAVELLER,
    schema: payloadSchema,
    apply: (db, { section, roundNumber, tableNumber, boardNumber, swapped }) =>
      setBoardSeatsSwapped(
        db,
        { section, roundNumber, tableNumber, boardNumber },
        swapped,
      ),
    errorMessage: "Failed to update played-reversed flag",
  });
}
