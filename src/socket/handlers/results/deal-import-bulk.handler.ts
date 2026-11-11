import "server-only";

import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { upsertDeals } from "@/db/games/actions/set-deal";
import { isCompleteDeal } from "@/model/deal";
import { Deal } from "@/model/common";
import { assertDirector } from "@/socket/middleware/director-auth";
import {
  registerHandler,
  HandlerError,
} from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

/** Upper bound on boards per import; far above any real board set. */
export const MAX_IMPORT_BOARDS = 100;

const dealSchema = z.object({
  N: z.array(z.string()),
  E: z.array(z.string()),
  S: z.array(z.string()),
  W: z.array(z.string()),
});

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  deals: z
    .array(
      z.object({
        boardNumber: z.number().int().positive(),
        deal: dealSchema,
      }),
    )
    .min(1)
    .max(MAX_IMPORT_BOARDS),
});

/**
 * Director-authed bulk import of deals from a dealing-machine PBN file. The
 * client parses the file; the server trusts none of it and re-validates every
 * deal. The batch is all-or-nothing: one bad deal (or a duplicated board
 * number) rejects the whole import, and the save runs in a single transaction.
 * Existing deals are always overwritten. After the ack, a fresh traveller /
 * leaderboard snapshot is pushed for each imported board so open "Show hand"
 * views update live.
 */
export function registerDealImportBulkHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { saved: number }>(
    socket,
    io,
    SocketEvents.DEAL_IMPORT_BULK,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, directorToken, deals } = payload;

        // assertDirector acks its own Unauthorized failure via the guarded ack.
        if (!assertDirector(directorToken, gameId, ack)) return;

        const seen = new Set<number>();
        for (const { boardNumber, deal } of deals) {
          if (seen.has(boardNumber)) {
            throw new HandlerError(
              `Board ${boardNumber} appears more than once`,
            );
          }
          seen.add(boardNumber);

          if (!isCompleteDeal(deal as Deal)) {
            throw new HandlerError(
              `Board ${boardNumber} is not a complete deal`,
            );
          }
        }

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        try {
          await upsertDeals(
            db,
            deals.map(({ boardNumber, deal }) => ({
              boardNumber,
              deal: deal as Deal,
            })),
          );
        } catch (err) {
          log.error(
            { err, gameId, boards: deals.length },
            "Failed to import deals",
          );
          throw new HandlerError("Failed to save deals");
        }

        ack({ success: true, data: { saved: deals.length } });

        for (const { boardNumber } of deals) {
          await broadcastResultsChanged(io, gameId, boardNumber);
        }
      },
    },
  );
}
