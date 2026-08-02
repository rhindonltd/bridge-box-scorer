import { useEffect } from "react";
import { mutate } from "swr";
import { getSocket } from "@/lib/socket";
import { SocketEventMap } from "@/socket/socket-event-map";

export function useSocketSWRSync<E extends keyof SocketEventMap>(
  event: E,
  handler: (
    payload: SocketEventMap[E],
  ) => { key: string; data: unknown } | null,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const socket = getSocket();

    const onEvent = (payload: SocketEventMap[E]) => {
      const result = handler(payload);

      if (!result) return;

      mutate(result.key, result.data, false);
    };

    socket.on(event as string, onEvent);

    return () => {
      socket.off(event as string, onEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
