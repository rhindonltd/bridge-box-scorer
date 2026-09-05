"use client";

import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";

/**
 * Whether a game is in progress (has been started).
 *
 * A game is "started" once its boards have been dealt out for play. Before that
 * the director is still setting the game up. We derive this from the game's
 * boards: an empty board list means the game has not been started yet. Kept
 * live by revalidating whenever the game changes or the connection is
 * re-established — matching the app's socket->SWR sync pattern.
 */
export function useGameStarted(gameId: string) {
  const key = swrKeys.boards(gameId);

  const { data, isLoading, error } = useSWR<{ boards: number[] }>(key, fetcher);

  const revalidate = useCallback(() => {
    void globalMutate(key);
  }, [key]);

  useSocketEvent(SocketEvents.GAME_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.CONNECT, revalidate, [key]);

  return {
    started: (data?.boards?.length ?? 0) > 0,
    isLoading,
    error,
  };
}
