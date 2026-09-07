import { SocketResponse } from "@/socket/socket-response";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket() {
  if (!socket) {
    // Connect back to the origin that served the page. On the appliance,
    // clients reach the app over the local WiFi network by the appliance's
    // own host/IP, which is exactly window.location.origin — not a fixed
    // build-time URL. Passing no URL lets socket.io-client default to the
    // current origin in the browser. Fall back to the configured/localhost
    // URL only for non-browser contexts (e.g. SSR).
    if (typeof window !== "undefined") {
      socket = io();
    } else {
      const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      socket = io(url);
    }
  }

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
