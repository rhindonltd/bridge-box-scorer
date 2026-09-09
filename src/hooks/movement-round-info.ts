"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { GameType } from "@/db/games/types/game-type";
import type { SelectedMovement } from "@/model/selected-movement";
import type { MovementByTable } from "@/movement/movementData";

/** The round structure derived from a selected movement. */
export interface MovementRoundInfo {
  /** Total number of rounds the movement plays. */
  rounds: number;
  /** Boards played per round. */
  boardsPerRound: number;
}

type MovementDetailResult = {
  type: GameType;
  tables: MovementByTable[];
};

/**
 * Derive the round structure ({@link MovementRoundInfo}) of a section's
 * selected movement.
 *
 * - `MITCHELL` selections carry `rounds` and `boardsPerRound` inline, so they
 *   resolve synchronously with no fetch.
 * - `SPEC` selections carry only `specId` + `boardsPerRound`; the round count is
 *   fetched from the movement detail endpoint and read off the first table
 *   (every table plays the same number of rounds).
 *
 * Returns `info: null` when no movement is selected or while a SPEC lookup is
 * still loading/errored, so callers can gate on a concrete result.
 */
export function useMovementRoundInfo(
  selectedMovement: SelectedMovement | null,
  gameType: GameType,
): { info: MovementRoundInfo | null; isLoading: boolean } {
  const isSpec = selectedMovement?.source === "SPEC";

  // Only fetch for SPEC selections; MITCHELL needs no network call.
  const { data, isLoading } = useSWR<MovementDetailResult>(
    isSpec ? swrKeys.movementDetail(gameType, selectedMovement.specId) : null,
    fetcher,
  );

  if (!selectedMovement) {
    return { info: null, isLoading: false };
  }

  if (selectedMovement.source === "MITCHELL") {
    return {
      info: {
        rounds: selectedMovement.mitchell.rounds,
        boardsPerRound: selectedMovement.mitchell.boardsPerRound,
      },
      isLoading: false,
    };
  }

  // SPEC: rounds come from the fetched detail; boards-per-round is on the
  // selection itself. Every table plays the same round count, so the first
  // table is representative.
  const rounds = data?.tables[0]?.rounds.length ?? null;
  if (rounds == null) {
    return { info: null, isLoading };
  }

  return {
    info: { rounds, boardsPerRound: selectedMovement.boardsPerRound },
    isLoading: false,
  };
}
