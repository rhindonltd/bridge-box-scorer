"use client";

import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketEvent } from "@/hooks/socket-event";
import { SocketEvents } from "@/socket/socket-events";
import { SelectedMovement } from "@/model/selected-movement";

/**
 * A section as seen by the client: its config plus the parsed per-section
 * movement selection (null until chosen).
 */
export interface ClientSection {
  section: string;
  label: string;
  tables: number;
  ordinal: number;
  selectedMovement: SelectedMovement | null;
}

/**
 * Fetch the game's sections and keep them live. Section membership/config
 * changes broadcast GAME_UPDATED game-wide, and per-section movement changes
 * emit SECTION_UPDATED; both revalidate this key.
 *
 * Note: this does not rely on GameContext's game-shaped GAME_UPDATED handler —
 * it revalidates its own key so it stays correct even when the payload carries
 * only { gameId, sections }.
 */
export function useSections(gameId: string) {
  const key = swrKeys.sections(gameId);

  const { data, isLoading, error } = useSWR<{ sections: ClientSection[] }>(
    key,
    fetcher,
  );

  const revalidate = useCallback(() => {
    void globalMutate(key);
  }, [key]);

  useSocketEvent(SocketEvents.GAME_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.SECTION_UPDATED, revalidate, [key]);
  useSocketEvent(SocketEvents.CONNECT, revalidate, [key]);

  return {
    sections: data?.sections ?? [],
    isLoading,
    error,
  };
}
