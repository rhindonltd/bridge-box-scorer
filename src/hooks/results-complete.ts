"use client";

import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import type { ResultsSummary } from "@/db/games/queries/get-results-summary";

/**
 * Whether every playable board in a game has a final result recorded.
 *
 * Derived from the results-summary endpoint, which counts playable boards
 * (excluding sit-outs) and how many are finalized. `allResultsIn` is the signal
 * used to enable USEBIO export. Kept live by revalidating whenever the game
 * changes or the connection is re-established — matching the app's socket->SWR
 * sync pattern (and mirroring useGameStarted).
 */
export function useResultsComplete(gameId: string) {
  const key = swrKeys.resultsSummary(gameId);

  const { data, isLoading, error } = useSWR<ResultsSummary>(key, fetcher);

  const revalidate = useCallback(() => {
    void globalMutate(key);
  }, [key]);

  useSocketEvent(SocketEvents.GAME_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.CONNECT, revalidate, [key]);

  return {
    allResultsIn: data?.allResultsIn ?? false,
    isLoading,
    error,
  };
}
