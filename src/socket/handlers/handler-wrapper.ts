import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketResponse } from "@/socket/socket-response";

/**
 * A user-facing error in a socket event: something the caller got wrong (bad
 * input, a violated precondition, failed auth) as opposed to an internal
 * failure. {@link registerHandler} acks it as `{ success: false, error }` with
 * the (safe) message; anything else is acked with a generic message and logged.
 */
export class HandlerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandlerError";
  }
}

/**
 * The single, idempotent acknowledgement callback handed to a handler. Calling
 * it more than once is a no-op after the first call, so a success ack can never
 * be followed by a spurious failure ack (and vice versa) even if downstream
 * side-effects throw. Mirrors `SocketResponse<T>` so the client's
 * `emitWithAck` unwraps it directly.
 */
export type SocketAck<T> = (response: SocketResponse<T>) => void;

/**
 * Everything a wrapped handler needs: the validated payload, the socket and io,
 * and the guarded {@link SocketAck}.
 */
export interface HandlerContext<TPayload, TData> {
  payload: TPayload;
  socket: Socket;
  io: Server;
  ack: SocketAck<TData>;
}

export interface HandlerDefinition<TPayload, TData> {
  /**
   * Optional zod schema validated against the raw payload before the handler
   * runs. On failure the caller is acked `{ success: false, error: "Invalid
   * request" }` and the handler never runs.
   */
  schema?: z.ZodType<TPayload>;
  /**
   * The handler body. Receives the validated payload and a guarded `ack`. It is
   * responsible for acking its own success / domain-rejection outcomes (or
   * throwing {@link HandlerError} for a user-facing failure); the wrapper's
   * try/catch is a safety net that acks a generic failure if the handler throws
   * without having acked.
   */
  handler: (ctx: HandlerContext<TPayload, TData>) => Promise<void> | void;
}

/**
 * Register a socket event handler with uniform validation, single-ack, and
 * error handling — the socket-side counterpart to the HTTP route wrappers.
 *
 * It absorbs the boilerplate every handler used to repeat by hand:
 * - **Validation**: if a `schema` is given, the raw payload is `safeParse`d;
 *   an invalid payload is logged (name/shape only, never the values) and acked
 *   `{ success: false, error: "Invalid request" }` without running the handler.
 * - **Single ack**: the `ack` passed to the handler fires at most once, so
 *   downstream side-effects that throw after a success ack cannot produce a
 *   second (failure) ack.
 * - **Error handling**: a thrown {@link HandlerError} is acked with its
 *   user-facing message; any other throw is logged with the event name and
 *   acked with a generic "Internal error" (no internals leak to the client).
 */
export function registerHandler<TPayload, TData = void>(
  socket: Socket,
  io: Server,
  event: string,
  definition: HandlerDefinition<TPayload, TData>,
) {
  const { schema, handler } = definition;

  socket.on(
    event,
    async (rawPayload: unknown, cb?: (response: SocketResponse<TData>) => void) => {
      // Idempotent ack: at most one response ever reaches the caller.
      let acked = false;
      const ack: SocketAck<TData> = (response) => {
        if (acked) return;
        acked = true;
        cb?.(response);
      };

      let payload: TPayload;
      if (schema) {
        const parsed = schema.safeParse(rawPayload);
        if (!parsed.success) {
          // Log the validation issue (never the payload values, which may carry
          // tokens/secrets) for director diagnostics.
          console.warn(`Invalid ${event} payload:`, parsed.error.message);
          ack({ success: false, error: "Invalid request" });
          return;
        }
        payload = parsed.data;
      } else {
        payload = rawPayload as TPayload;
      }

      try {
        await handler({ payload, socket, io, ack });
      } catch (err) {
        if (err instanceof HandlerError) {
          ack({ success: false, error: err.message });
          return;
        }
        console.error(`Error handling ${event}:`, err);
        ack({ success: false, error: "Internal error" });
      }
    },
  );
}
