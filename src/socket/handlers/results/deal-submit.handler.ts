import "server-only";

import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { insertDealIfAbsent } from "@/db/games/actions/set-deal";
import { isCompleteDeal } from "@/model/deal";
import { Deal } from "@/model/common";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

/**
 * A deal payload is the four hands keyed by direction, each a list of card
 * codes. Strict card/completeness rules are enforced by `isCompleteDeal`; the
 * schema only guarantees the shape so the handler can trust the structure.
 */
const dealSchema = z.object({
  N: z.array(z.string()),
  E: z.array(z.string()),
  S: z.array(z.string()),
  W: z.array(z.string()),
});

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
  boardNumber: z.number().int().positive(),
  deal: dealSchema,
});

/**
 * Player-submitted deal for a board, entered after the round is complete.
 *
 * Global first-wins: the first player (in any section) to enter board N's cards
 * sets them via `insertDealIfAbsent`; a later submission for a board that
 * already has a deal is acked as a clean "already entered" outcome (not an
 * error), so the client can switch to read-only. On a fresh insert we fan out
 * the recomputed traveller/leaderboard snapshots so any open "Show hand" view
 * updates live.
 */
export function registerDealSubmitHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { stored: boolean }>(
    socket,
    io,
    SocketEvents.DEAL_SUBMIT,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, seat, token, boardNumber, deal } = payload;

        // Verify the submission carries the seat's player token first.
        if (!(await assertPlayer(gameId, seat, token, ack))) {
          return;
        }

        // Reject anything that is not a complete, legal 52-card deal before
        // touching the DB (mirrors the action's own guard, but surfaces a
        // user-facing message here).
        if (!isCompleteDeal(deal as Deal)) {
          throw new HandlerError("That is not a complete deal");
        }

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        let result;
        try {
          result = await insertDealIfAbsent(db, boardNumber, deal as Deal);
        } catch (err) {
          log.error({ err, gameId, boardNumber }, "Failed to store deal");
          throw new HandlerError("Failed to save deal");
        }

        // "exists" is a normal outcome (someone got there first): ack success
        // with stored:false so the client shows the existing deal read-only.
        ack({ success: true, data: { stored: result.status === "inserted" } });

        if (result.status === "inserted") {
          await broadcastResultsChanged(io, gameId, boardNumber);
        }
      },
    },
  );
}
