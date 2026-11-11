"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import type { SocketEventMap } from "@/socket/socket-event-map";
import {
  clearPlayerToken,
  getPlayerToken,
  setPlayerToken,
} from "@/lib/player-token";

/**
 * When the director evicts this device's pair (pre-start only), drop the
 * now-dead player token and send the player back to seat selection — exactly
 * as if they had chosen "Leave table".
 *
 * Used by every screen a seated device can be on before the game starts (the
 * waiting screen via the play page, and the Change device page), so an
 * eviction is never missed while the player is looking at a different screen.
 */
/**
 * A director splitting a section renumbers seats (e.g. this device's A5NS
 * becomes B1NS). The server pushes every old→new move to the game room; if
 * THIS device's seat moved, adopt the new seat: rewrite the stored player
 * token's position (the auth secret is unchanged) and re-route to the new play
 * URL so every seat-keyed read (play state, pair, submissions) lines up with
 * the DB again. Without this the device would be stranded on a seat that no
 * longer exists.
 *
 * Used by the play page and the Change device page (both reachable pre-start).
 */
export function useSeatRenumberedRedirect(gameId: string, seat: string): void {
  const router = useRouter();

  const onSeatRenumbered = useCallback(
    (payload: SocketEventMap[typeof SocketEvents.SEAT_RENUMBERED]) => {
      if (payload.gameId !== gameId) return;
      const move = payload.moves.find((m) => m.from === seat);
      if (!move) return;

      const stored = getPlayerToken(gameId);
      if (stored) {
        setPlayerToken(gameId, { ...stored, startingPosition: move.to });
      }
      router.replace(`/game/${gameId}/play/${move.to}`);
    },
    [gameId, seat, router],
  );

  useSocketEvent(SocketEvents.SEAT_RENUMBERED, onSeatRenumbered, [
    onSeatRenumbered,
  ]);
}

export function useSeatEvictedRedirect(gameId: string, seat: string): void {
  const router = useRouter();

  const onSeatEvicted = useCallback(
    (payload: SocketEventMap[typeof SocketEvents.SEAT_EVICTED]) => {
      if (payload.gameId !== gameId || payload.seat !== seat) return;
      clearPlayerToken(gameId);
      router.replace(`/game/${gameId}/join`);
    },
    [gameId, seat, router],
  );

  useSocketEvent(SocketEvents.SEAT_EVICTED, onSeatEvicted, [onSeatEvicted]);
}
