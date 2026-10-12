import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { buildVoidMatch } from "@/model/teams-match-void";
import { voidTeamsMatch } from "@/db/games/actions/set-board-result";
import {
  registerDirectorBoardRuling,
  directorRulingSchema,
} from "./director-board-ruling";

const payloadSchema = directorRulingSchema({
  // How the void is scored (§3.3.6.1 flat 40/60, or §3.3.9 half-split by
  // offender), expressed relative to the acted row's NS/EW seats.
  cause: z.enum([
    "SEATING_STANDARD",
    "SEATING_TD",
    "SHORT_OFFENDER_NS",
    "SHORT_OFFENDER_EW",
    "SHORT_BOTH",
    "SHORT_NEITHER",
  ]),
});

/**
 * Director-authed voiding of a whole TEAMS match (EBU White Book §3.3.6.1 /
 * §3.3.9). Flips the acted room's board rows to VOID_MATCH with the chosen
 * `VOID:<cause>` token, so the teams VP scorer credits each team a ruling VP
 * instead of a margin → VP, then fans out recomputed snapshots. Mirrors the
 * other director board-ruling handlers.
 */
export function registerVoidTeamsMatchHandler(socket: Socket, io: Server) {
  registerDirectorBoardRuling(socket, io, {
    event: SocketEvents.VOID_TEAMS_MATCH_TRAVELLER,
    schema: payloadSchema,
    apply: (db, { roundNumber, tableNumber, boardNumber, cause }) =>
      voidTeamsMatch(
        db,
        // boardNumber disambiguates a triple: a triple home table hosts two
        // separate 10-VP comparisons, so the acted board picks the right one.
        { roundNumber, tableNumber, boardNumber },
        buildVoidMatch(cause),
      ),
    errorMessage: "Failed to void match",
  });
}
