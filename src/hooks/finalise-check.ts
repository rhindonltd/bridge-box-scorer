"use client";
import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import type { FinaliseCheckResult } from "@/model/finalise-validator";

/**
 * Fetches whether the game can currently be finalised (every result is in) and
 * keeps it live by revalidating when the game changes, a board result changes,
 * or the socket reconnects, matching the app's socket -> SWR sync pattern.
 */
export function useFinaliseCheck(gameId: string) {
  const key = swrKeys.finaliseCheck(gameId);
  const { data, isLoading, error } = useSWR<FinaliseCheckResult>(key, fetcher);

  const revalidate = useCallback(() => {
    void globalMutate(key);
  }, [key]);

  useSocketEvent(SocketEvents.GAME_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.BOARD_CONFIRMED, revalidate, [key]);
  useSocketEvent(SocketEvents.BOARD_RESULT_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.CONNECT, revalidate, [key]);

  return {
    canFinalise: data?.canFinalise ?? false,
    problems: data?.problems ?? [],
    isLoading,
    error,
  };
}
