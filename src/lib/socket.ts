import { SocketResponse } from "@/socket/socket-response";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    socket = io(url);
  }

  return socket;
}

/**
 * Initialises (or returns) the socket with a director token in the handshake
 * auth. Call this once after a successful director login, before any director
 * socket events are emitted.
 *
 * If the socket is already connected without a token it is disconnected and
 * reconnected with the token so the server middleware can mark it as a director.
 */
export function getDirectorSocket(directorToken: string): Socket {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (socket) {
    const currentToken =
      socket.auth && (socket.auth as Record<string, string>).directorToken;
    if (currentToken === directorToken) return socket;

    // Reconnect with the token attached.
    socket.disconnect();
  }

  socket = io(url, { auth: { directorToken } });
  return socket;
}

export function emitWithAck<T>(
  event: string,
  payload?: unknown,
  timeoutMs = 5000,
): Promise<T> {
  const socket = getSocket();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);

    socket.emit(event, payload, (response: SocketResponse<T>) => {
      clearTimeout(timeout);

      if (!response.success) {
        reject(new Error(response.error));
        return;
      }

      resolve(response.data);
    });
  });
}

export function emitEvent(event: string, payload?: unknown) {
  getSocket().emit(event, payload);
}
