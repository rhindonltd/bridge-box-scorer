"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { storedMovementDetailKey } from "@/swr/swr-keys";
import type { SelectedMovement } from "@/model/selected-movement";
import type { MovementByTable } from "@/modules/movement-catalog";

/** The round structure derived from a selected movement. */
export interface MovementRoundInfo {
  /** Total number of rounds the movement plays. */
  rounds: number;
  /** Boards played per round. */
  boardsPerRound: number;
}

type MovementDetailResult = {
  tables: MovementByTable[];
};

/**
 * Derive the round structure ({@link MovementRoundInfo}) of a section's
 * selected movement.
 *
 * - `MITCHELL` selections carry `rounds` and `boardsPerRound` inline, so they
 *   resolve synchronously with no fetch.
 * - `SPEC` and `TEAMS_SPEC` selections (a pairs or teams library movement)
 *   carry only `specId` + `boardsPerRound`; the round count is fetched from the
 *   movement's detail endpoint and read off the first table (every table plays
 *   the same number of rounds).
 *
 * Returns `info: null` when no movement is selected or while a SPEC lookup is
 * still loading/errored, so callers can gate on a concrete result.
 */
export function useMovementRoundInfo(
  selectedMovement: SelectedMovement | null,
): { info: MovementRoundInfo | null; isLoading: boolean } {
  // Only a stored (library) movement is fetched; the others need no call.
  const { data, isLoading } = useSWR<MovementDetailResult>(
    storedMovementDetailKey(selectedMovement),
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

  if (selectedMovement.source === "SWISS") {
    // Swiss carries its round count and boards-per-round on the selection; no
    // fetch is needed (the schedule is drawn round by round, not stored).
    return {
      info: {
        rounds: selectedMovement.swiss.rounds,
        boardsPerRound: selectedMovement.swiss.boardsPerRound,
      },
      isLoading: false,
    };
  }

  if (selectedMovement.source === "SWISS_TEAMS") {
    // Swiss Teams likewise carries its round count and boards-per-round on the
    // selection; the schedule is drawn round by round, not stored.
    return {
      info: {
        rounds: selectedMovement.swissTeams.rounds,
        boardsPerRound: selectedMovement.swissTeams.boardsPerRound,
      },
      isLoading: false,
    };
  }

  if (selectedMovement.source === "AMERICAN_WHIST_TEAMS") {
    // American Whist plays every round (teams − 1) at the selection's boards
    // per round; no fetch is needed.
    return {
      info: {
        rounds: selectedMovement.americanWhistTeams.teams - 1,
        boardsPerRound: selectedMovement.americanWhistTeams.boardsPerRound,
      },
      isLoading: false,
    };
  }

  if (selectedMovement.source === "CIRCULATION_TEAMS") {
    // A Circulation always plays three rounds; no fetch is needed.
    return {
      info: {
        rounds: 3,
        boardsPerRound: selectedMovement.circulationTeams.boardsPerRound,
      },
      isLoading: false,
    };
  }
  if (selectedMovement.source === "THURNER_TEAMS") {
    // A Thurner plays every round (teams − 1); no fetch is needed.
    return {
      info: {
        rounds: selectedMovement.thurnerTeams.teams - 1,
        boardsPerRound: selectedMovement.thurnerTeams.boardsPerRound,
      },
      isLoading: false,
    };
  }
  if (selectedMovement.source === "HEAD_TO_HEAD_TEAMS") {
    // A head-to-head always plays two stanzas; no fetch is needed.
    return {
      info: {
        rounds: 2,
        boardsPerRound: selectedMovement.headToHeadTeams.boardsPerRound,
      },
      isLoading: false,
    };
  }
  if (selectedMovement.source === "STAGGER_TEAMS") {
    // A Stagger plays every round (teams − 1); no fetch is needed.
    return {
      info: {
        rounds: selectedMovement.staggerTeams.teams - 1,
        boardsPerRound: selectedMovement.staggerTeams.boardsPerRound,
      },
      isLoading: false,
    };
  }
  // SPEC / TEAMS_SPEC: rounds come from the fetched detail; boards-per-round is on the
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
