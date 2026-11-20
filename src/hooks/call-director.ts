import { useCallback, useRef, useState } from "react";
import { callDirector } from "@/lib/game-service";
import { primeChime } from "@/lib/chime";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import type { SocketEventMap } from "@/socket/socket-event-map";
import type { CallingTable } from "@/model/director-alert";

/** Where the player is in calling the director. */
export type CallDirectorState =
  | { step: "closed" }
  | { step: "confirm" }
  | { step: "sending" }
  | { step: "called"; table: CallingTable; calls: number }
  | { step: "answered" }
  | { step: "error"; message: string };

/**
 * The player's side of "Call Director": confirm, send, then (once a director
 * dismisses the popup) hear that the director is on the way.
 *
 * The "on the way" notice arrives on the seat's room, which the play screens
 * already join, and is only shown to a device that has itself called.
 */
export function useCallDirector(gameId: string, seat: string) {
  const [state, setState] = useState<CallDirectorState>({ step: "closed" });
  // True from a successful call until the player closes the dialog or hears back.
  const awaiting = useRef(false);

  const open = useCallback(() => {
    // The tap that opens the dialog is the user gesture that unlocks audio.
    primeChime();
    setState({ step: "confirm" });
  }, []);

  const close = useCallback(() => setState({ step: "closed" }), []);

  const confirm = useCallback(async () => {
    setState({ step: "sending" });
    try {
      const { table, calls } = await callDirector(gameId, seat);
      awaiting.current = true;
      setState({ step: "called", table, calls });
    } catch (e) {
      setState({
        step: "error",
        message: e instanceof Error ? e.message : "Could not call the director",
      });
    }
  }, [gameId, seat]);

  const onAnswered = useCallback(
    (payload: SocketEventMap[typeof SocketEvents.DIRECTOR_CALL_ANSWERED]) => {
      if (payload.gameId !== gameId || payload.seat !== seat) return;
      if (!awaiting.current) return;
      awaiting.current = false;
      setState({ step: "answered" });
    },
    [gameId, seat],
  );
  useSocketEvent(SocketEvents.DIRECTOR_CALL_ANSWERED, onAnswered, [onAnswered]);

  return { state, open, close, confirm };
}
