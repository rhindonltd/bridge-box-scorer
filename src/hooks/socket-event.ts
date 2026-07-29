import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export function useSocketEvent<T>(
  event: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const socket = getSocket();

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
