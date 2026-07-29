import { Socket } from "socket.io";
import { findLoginSession } from "@/db/system/queries/find-login-session";

declare module "socket.io" {
  interface SocketData {
    isDirector: boolean;
  }
}

/**
 * Socket.IO connection middleware.
 *
 * Reads an optional `directorToken` from the handshake auth object and validates
 * it against the login-sessions DB. Sets `socket.data.isDirector = true` when
 * the token is valid. Non-director clients (players) connect normally with
 * `isDirector = false`.
 *
 * Usage on the client (director only):
 *   const socket = io(url, { auth: { directorToken: "<token>" } });
 */
export function directorAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
) {
  socket.data.isDirector = false;

  const token = socket.handshake.auth?.directorToken as string | undefined;
  if (!token) {
    return next();
  }

  try {
    const session = findLoginSession(token);
    if (session && session.role === "DIRECTOR") {
      socket.data.isDirector = true;
    }
  } catch (err) {
    console.error("Director auth middleware error:", err);
    // Don't block the connection — just leave isDirector = false.
  }

  next();
}

/**
 * Guard for director-only socket event handlers.
 *
 * Call at the top of any handler that should be restricted to directors.
 * Returns true if the socket is authorised; returns false and invokes the
 * optional callback with an error so the client receives a typed response.
 *
 * Usage:
 *   socket.on(SocketEvents.CREATE_GAME, (payload, cb) => {
 *     if (!assertDirector(socket, cb)) return;
 *     ...
 *   });
 */
export function assertDirector(
  socket: Socket,
  cb?: (response: { success: false; error: string }) => void,
): boolean {
  if (socket.data.isDirector) return true;

  console.warn(`Unauthorised director event attempt from socket ${socket.id}`);
  cb?.({ success: false, error: "Unauthorized" });
  return false;
}
