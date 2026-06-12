import { io, Socket } from "socket.io-client";

let socket: Socket;

export function getSocket() {
  if (!socket) {
    socket = io("http://localhost:3000");
  }

  return socket;
}

type SuccessResponse<T> = {
  success: true;
  data: T;
};

type ErrorResponse = {
  success: false;
  error: string;
};

type SocketResponse<T> = SuccessResponse<T> | ErrorResponse;

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
