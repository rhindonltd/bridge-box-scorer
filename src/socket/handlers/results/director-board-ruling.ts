import { Server, Socket } from "socket.io";
import { z } from "zod";
import { getDb, type Db } from "@/db/games";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastResultsChanged } from "./broadcast-results";

/**
 * The payload fields every director board-ruling shares: the game, the director
 * token, and the (round, table, board) the director acted from. A specific
 * ruling extends this with its own field (an outcome string, a `cause`, a
 * `fault`, …) via {@link directorRulingSchema}.
 */
export const boardRulingBaseSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardNumber: z.number().int().positive(),
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
});

export type BoardRulingBase = z.infer<typeof boardRulingBaseSchema>;

/** Merge the shared base fields with a ruling's own extra fields. */
export function directorRulingSchema<T extends z.ZodRawShape>(
  extra: T,
): z.ZodObject<T & typeof boardRulingBaseSchema.shape> {
  return boardRulingBaseSchema.extend(extra);
}

interface DirectorBoardRulingDefinition<TPayload extends BoardRulingBase> {
  /** The socket event this ruling is wired to. */
  event: string;
  /** Payload schema — build it with {@link directorRulingSchema}. */
  schema: z.ZodType<TPayload>;
  /**
   * Persist the ruling. Receives the resolved game db and the validated
   * payload; throws on failure (caught and surfaced as {@link errorMessage}).
   * The DB action's `location` shape differs per ruling (some omit the board),
   * so each caller builds its own call here.
   */
  apply: (db: Db, payload: TPayload) => Promise<void>;
  /** The user-facing message when {@link apply} throws. */
  errorMessage: string;
}

/**
 * Register a director-authed, single-board ruling handler.
 *
 * Every such ruling (override, cancel/foul, teams board removal, teams match
 * void, pairs match void) runs the identical pipeline — validate the director
 * token, resolve the game db, persist the ruling, ack success, then fan out
 * recomputed leaderboard / traveller snapshots via the shared occupancy-gated
 * broadcaster. This factory owns that pipeline so each ruling only declares its
 * event, payload schema, the single persist call, and its error message.
 *
 * `assertDirector` acks its own Unauthorized failure via the guarded ack, so an
 * unauthorized caller short-circuits before any db work.
 */
export function registerDirectorBoardRuling<TPayload extends BoardRulingBase>(
  socket: Socket,
  io: Server,
  { event, schema, apply, errorMessage }: DirectorBoardRulingDefinition<TPayload>,
) {
  registerHandler<TPayload, null>(socket, io, event, {
    schema,
    handler: async ({ payload, ack, log }) => {
      const { gameId, directorToken, boardNumber } = payload;

      if (!assertDirector(directorToken, gameId, ack)) return;

      const db = await getDb(gameId);
      if (!db) {
        throw new HandlerError("Game not found");
      }

      try {
        await apply(db, payload);
      } catch (err) {
        log.error(
          { err, gameId, boardNumber, roundNumber: payload.roundNumber, tableNumber: payload.tableNumber },
          errorMessage,
        );
        throw new HandlerError(errorMessage);
      }

      ack({ success: true, data: null });

      await broadcastResultsChanged(io, gameId, boardNumber);
    },
  });
}
