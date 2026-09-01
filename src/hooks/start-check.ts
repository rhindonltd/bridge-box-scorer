"use client";

import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import { StartValidationResult } from "@/model/start-validator";

/**
 * Fetches whether the game can currently be started (movement + seating are
 * valid) and keeps it live by revalidating whenever the game changes or the
 * socket reconnects — matching the app's socket->SWR sync pattern.
 */
export function useStartCheck(gameId: string) {
  const key = swrKeys.startCheck(gameId);

  const { data, isLoading, error } = useSWR<StartValidationResult>(
    key,
    fetcher,
  );

  const revalidate = useCallback(() => {
    void globalMutate(key);
  }, [key]);

  useSocketEvent(SocketEvents.GAME_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.CONNECT, revalidate, [key]);

  return {
    canStart: data?.canStart ?? false,
    problems: data?.problems ?? [],
    sitOutSeat: data?.sitOutSeat ?? null,
    isLoading,
    error,
  };
}
