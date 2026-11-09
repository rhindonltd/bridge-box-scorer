import { useCallback, useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { watchSeat } from "@/lib/game-service";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import type { SocketEventMap } from "@/socket/socket-event-map";

/**
 * True once this device has been signed out of `seat` because another device
 * took it over (a change-device or handover claim, or the director moving the
 * pair after a lost device).
 *
 * Two ways to find out: the live `SEAT_TAKEN_OVER` notice, and a check against
 * the server on mount and on every socket reconnect. The check matters for a
 * device that was off or out of signal when the seat moved — it missed the live
 * notice, but its stale token is caught as soon as it reconnects. The same check
 * is what subscribes the device to the notice, so a device that never minted a
 * code (e.g. one the director moved) still hears about it.
 */
export function useSeatTakenOver(gameId: string, seat: string): boolean {
  const [takenOver, setTakenOver] = useState(false);

  const onSeatTakenOver = useCallback(
    (payload: SocketEventMap[typeof SocketEvents.SEAT_TAKEN_OVER]) => {
      if (payload.gameId === gameId && payload.seat === seat) {
        setTakenOver(true);
      }
    },
    [gameId, seat],
  );
  useSocketEvent(SocketEvents.SEAT_TAKEN_OVER, onSeatTakenOver, [
    onSeatTakenOver,
  ]);

  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;
    const check = () => {
      void watchSeat(gameId, seat).then((status) => {
        if (!cancelled && status === "moved") setTakenOver(true);
      });
    };
    check();
    // A reconnecting socket has been dropped from its rooms server-side, so
    // re-subscribe (and re-check) each time it comes back.
    socket.on(SocketEvents.CONNECT, check);
    return () => {
      cancelled = true;
      socket.off(SocketEvents.CONNECT, check);
    };
  }, [gameId, seat]);

  return takenOver;
}
