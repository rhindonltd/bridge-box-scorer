import type { Socket } from "socket.io-client";

export function emitWithAck<T = any>(
  socket: Socket,
  event: string,
  payload: any,
): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: T) => {
      resolve(response);
    });
  });
}

export function waitForEvent(socket: any, event: string, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.on(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
