import "server-only";

import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { upsertDeal } from "@/db/games/actions/set-deal";
import { isCompleteDeal } from "@/model/deal";
import { Deal } from "@/model/common";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

const dealSchema = z.object({
  N: z.array(z.string()),
  E: z.array(z.string()),
  S: z.array(z.string()),
  W: z.array(z.string()),
});

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardNumber: z.number().int().positive(),
  deal: dealSchema,
});

/**
 * Director-authed entry / correction of a board's deal. Unlike player entry,
 * this always overwrites via `upsertDeal` (the director may correct any board),
 * then fans out recomputed traveller/leaderboard snapshots so open "Show hand"
 * views update live.
 *
 * This is also the entry point a future dealing-machine file import reuses:
 * parse the file into deals (via the pure deal model) and call this per board.
 */
export function registerDealOverrideHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.DEAL_OVERRIDE,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, directorToken, boardNumber, deal } = payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        if (!isCompleteDeal(deal as Deal)) {
          throw new HandlerError("That is not a complete deal");
        }

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await upsertDeal(db, boardNumber, deal as Deal);
        } catch (err) {
          log.error({ err, gameId, boardNumber }, "Failed to override deal");
          throw new HandlerError("Failed to save deal");
        }

        ack({ success: true, data: null });

        await broadcastResultsChanged(io, gameId, boardNumber);
      },
    },
  );
}
