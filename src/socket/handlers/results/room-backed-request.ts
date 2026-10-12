import { Server, Socket } from "socket.io";
import { z } from "zod";
import { getDb, type Db } from "@/db/games";
import { registerHandler } from "@/socket/handlers/handler-wrapper";

interface RoomBackedRequestDefinition<TRequest, TLeave, TData> {
  /** The acknowledged `*:requestState` event. */
  requestEvent: string;
  /** The fire-and-forget `*:leave` event. */
  leaveEvent: string;
  /** Schema for the request payload. */
  schema: z.ZodType<TRequest>;
  /**
   * Schema for the leave payload. Defaults to {@link schema} when the leave
   * carries the same shape as the request (leaderboard, traveller); a feature
   * whose leave is narrower (round-results sends only `gameId`) passes its own.
   */
  leaveSchema?: z.ZodType<TLeave>;
  /**
   * The feature room for a (request or leave) payload. Both payloads carry the
   * room-identifying fields, so one function serves join and leave.
   */
  room: (payload: TRequest | TLeave) => string;
  /**
   * Compute the snapshot returned on the request ack. Receives the resolved
   * game db and validated payload. A thrown error is treated as "no snapshot
   * yet" (acked as `data: null`), not a failure.
   */
  buildSnapshot: (db: Db, payload: TRequest) => Promise<TData>;
  /** Message logged when {@link buildSnapshot} throws. */
  errorLog: string;
}

/**
 * Register a "socket-only, DB-derived" feature's request/leave pair — the
 * server counterpart to the client's `useFeatureSnapshot` hook.
 *
 * Every such feature (leaderboard, traveller, round-results) follows the same
 * contract: on `*:requestState` the socket JOINS the feature room (so it
 * receives pushed `*:sync` updates and the server knows the room is occupied)
 * and the current snapshot is acked; a compute failure (or a missing game db)
 * is acked as `{ success: true, data: null }` — "no snapshot yet", never a
 * failure — so the client stays in its loading/empty state. A matching
 * `*:leave` removes the socket from the room on unmount. Reading is public, so
 * there is no director auth.
 *
 * This factory owns that join/ack-or-null/leave skeleton; each feature declares
 * only its events, schemas, room, and snapshot builder.
 */
export function registerRoomBackedRequest<TRequest, TLeave, TData>(
  socket: Socket,
  io: Server,
  {
    requestEvent,
    leaveEvent,
    schema,
    leaveSchema,
    room,
    buildSnapshot,
    errorLog,
  }: RoomBackedRequestDefinition<TRequest, TLeave, TData>,
) {
  registerHandler<TRequest, TData | null>(socket, io, requestEvent, {
    schema,
    handler: async ({ payload, ack, log }) => {
      socket.join(room(payload));

      try {
        const db = await getDb(
          (payload as { gameId: string }).gameId,
        );
        const snapshot = db ? await buildSnapshot(db, payload) : null;
        ack({ success: true, data: snapshot });
      } catch (err) {
        log.error({ err, payload }, errorLog);
        ack({ success: true, data: null });
      }
    },
  });

  const resolvedLeaveSchema = (leaveSchema ?? schema) as z.ZodType<
    TRequest | TLeave
  >;
  socket.on(leaveEvent, (payload: unknown) => {
    const parsed = resolvedLeaveSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(room(parsed.data));
  });
}
