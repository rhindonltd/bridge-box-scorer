"use client";

import { useEffect } from "react";
import { getSocket, emitWithAck, emitEvent } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";

/**
 * Shared wiring for the "socket-only, DB-derived" feature contexts
 * (leaderboard, traveller, timer). Each of those follows the same lifecycle:
 *
 *  1. On mount (and on every socket reconnect) request the current snapshot via
 *     an acknowledged `*:requestState` event — which also joins the feature
 *     room server-side — and apply it.
 *  2. Apply pushed `*:sync` events on top for the lifetime of the mount.
 *  3. On unmount (and when the request params change) emit a `*:leave` so the
 *     server stops recomputing for a client that is no longer watching.
 *
 * This hook owns that skeleton so each context only supplies what makes it
 * distinct: how to apply a snapshot/sync payload, the event names, the request
 * and leave payloads, and any extra event listeners (e.g. the timer's
 * `timer:cleared`). `apply` receives a `cancelled` ref so late async responses
 * after unmount are dropped, matching the hand-rolled versions this replaces.
 *
 * `TSnapshot` is the acknowledged request payload's data shape; `TSync` is the
 * pushed sync event's payload shape (usually the same, occasionally wider).
 */
export interface FeatureSnapshotConfig<TSnapshot, TSync> {
  /** Acknowledged request event, e.g. `timer:requestState`. */
  requestEvent: string;
  /** Pushed live-update event, e.g. `timer:sync`. */
  syncEvent: string;
  /** Fire-and-forget leave event, e.g. `timer:leave`. */
  leaveEvent: string;
  /** Payload sent with both the request and the leave (identifies the room). */
  params: Record<string, unknown>;
  /** Apply a snapshot (from the request ack) or a pushed sync payload. */
  apply: (payload: TSnapshot | TSync | null) => void;
  /** Called if the acknowledged request rejects/times out (e.g. clear loading). */
  onRequestError?: () => void;
  /**
   * Extra socket listeners to register for the mount's lifetime, beyond the
   * standard sync + reconnect wiring. Given as [event, handler] pairs so the
   * hook can register and clean them up.
   *
   * IMPORTANT: these handlers are captured once when the effect runs (keyed on
   * `deps`), so a handler must only close over values that are present in
   * `deps`. A handler closing over state NOT listed in `deps` would silently
   * capture a stale value. (The timer context's `timer:cleared` handler is safe
   * because it closes over `section`, which is in its `deps`.)
   */
  extraListeners?: [event: string, handler: (...args: never[]) => void][];
  /**
   * Effect dependencies. The effect re-runs (leaving the old room, joining the
   * new one) when any of these change — typically the room-identifying params.
   */
  deps: unknown[];
}

export function useFeatureSnapshot<TSnapshot, TSync>(
  config: FeatureSnapshotConfig<TSnapshot, TSync>,
): void {
  const {
    requestEvent,
    syncEvent,
    leaveEvent,
    params,
    apply,
    onRequestError,
    extraListeners,
    deps,
  } = config;

  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;

    async function requestSnapshot() {
      try {
        const data = await emitWithAck<TSnapshot | null>(requestEvent, params);
        if (!cancelled) apply(data);
      } catch {
        if (!cancelled) onRequestError?.();
      }
    }

    const handleSync = (payload: TSync) => {
      if (!cancelled) apply(payload);
    };
    socket.on(syncEvent, handleSync);

    const handleReconnect = () => {
      void requestSnapshot();
    };
    socket.on(SocketEvents.CONNECT, handleReconnect);

    for (const [event, handler] of extraListeners ?? []) {
      socket.on(event, handler as (...args: unknown[]) => void);
    }

    void requestSnapshot();

    return () => {
      cancelled = true;
      socket.off(syncEvent, handleSync);
      socket.off(SocketEvents.CONNECT, handleReconnect);
      for (const [event, handler] of extraListeners ?? []) {
        socket.off(event, handler as (...args: unknown[]) => void);
      }
      // Leave the feature room so the server stops recomputing for this client.
      emitEvent(leaveEvent, params);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
