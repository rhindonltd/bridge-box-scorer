import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { buildPairVoid } from "@/model/pairs-match-void";
import { voidPairsMatch } from "@/db/games/actions/set-board-result";
import {
  registerDirectorBoardRuling,
  directorRulingSchema,
} from "./director-board-ruling";

const payloadSchema = directorRulingSchema({
  // Why the match is void (§3.3.8/§3.3.9), relative to the acted row's seats:
  // OFFENDER_NS/OFFENDER_EW/BOTH/NEITHER → each pair's AVE+/AVE−/AVE blend.
  cause: z.enum(["OFFENDER_NS", "OFFENDER_EW", "BOTH", "NEITHER"]),
});

/**
 * Director-authed voiding of a whole SWISS-PAIRS match (EBU White Book §3.3.8 /
 * §3.3.9). Flips the acted table's board rows to VOID_PAIR with the chosen
 * `VOIDP:<cause>` token, so the Swiss-pairs VP scorer removes the match from the
 * field and credits each pair an AVE+/AVE−/AVE compensation, then fans out
 * recomputed snapshots. Mirrors the teams void handler. The void applies to the
 * whole table (round + table); `boardNumber` is only the board the director
 * acted from, used for the live traveller push.
 */
export function registerVoidPairsMatchHandler(socket: Socket, io: Server) {
  registerDirectorBoardRuling(socket, io, {
    event: SocketEvents.VOID_PAIRS_MATCH_TRAVELLER,
    schema: payloadSchema,
    apply: (db, { roundNumber, tableNumber, cause }) =>
      voidPairsMatch(db, { roundNumber, tableNumber }, buildPairVoid(cause)),
    errorMessage: "Failed to void pairs match",
  });
}
