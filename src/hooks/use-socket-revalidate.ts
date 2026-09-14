"use client";

import { useEffect } from "react";
import { mutate as globalMutate } from "swr";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";

/**
 * One trigger for {@link useSocketRevalidate}: a socket event that should cause
 * the given SWR key to revalidate. An optional `when` predicate gates the
 * revalidation on the event payload (e.g. only when a section-scoped update
 * names this consumer's section).
 */
export interface RevalidateTrigger {
  event: string;
  when?: (payload: unknown) => boolean;
}

/**
 * Revalidate an SWR key in response to socket events. This is the companion to
 * `useSocketSWRSync` for the common "mutate-to-revalidate" case: several
 * providers hand-rolled `socket.on(GAME_UPDATED, () => globalMutate(key));
 * socket.on(CONNECT, …); return off/off`. This hook owns that wiring.
 *
 * A reconnect (`CONNECT`) always revalidates — reconnecting clients may have
 * missed updates while offline — so callers list only their domain events.
 *
 * `triggers` may be event-name strings (revalidate unconditionally) or
 * {@link RevalidateTrigger} objects (revalidate only when `when` returns true).
 */
export function useSocketRevalidate(
  key: string,
  triggers: (string | RevalidateTrigger)[],
  deps: unknown[] = [],
): void {
  useEffect(() => {
    const socket = getSocket();
    const revalidate = () => {
      void globalMutate(key);
    };

    const normalised: RevalidateTrigger[] = triggers.map((t) =>
      typeof t === "string" ? { event: t } : t,
    );

    const handlers = normalised.map(({ event, when }): [string, (p: unknown) => void] => {
      const handler = (payload: unknown) => {
        if (!when || when(payload)) revalidate();
      };
      return [event, handler];
    });

    for (const [event, handler] of handlers) {
      socket.on(event, handler);
    }
    socket.on(SocketEvents.CONNECT, revalidate);

    return () => {
      for (const [event, handler] of handlers) {
        socket.off(event, handler);
      }
      socket.off(SocketEvents.CONNECT, revalidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
