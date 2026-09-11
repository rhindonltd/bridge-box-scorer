"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { GameType } from "@/db/games/types/game-type";
import type { SelectedMovement } from "@/model/selected-movement";
import type { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

type MovementDetailResult = {
  type: GameType;
  name: string;
};

/**
 * Human-readable name for a generated Mitchell selection, derived from its
 * variant flags. Generated Mitchells are not seeded, so they have no stored
 * name; this mirrors the labels used by the recommendation cards.
 */
function mitchellName(spec: MitchellMovementSpec | undefined): string {
  if (!spec) return "Mitchell";
  if (spec.skip) return "Skip Mitchell";
  if (spec.shareAndRelay) return "Share and Relay Mitchell";
  if (spec.web) return "Web Mitchell";
  if (spec.hesitation) return "Hesitation Mitchell";
  return "Standard Mitchell";
}

/**
 * Resolve a section's selected movement into its display name.
 *
 * - `MITCHELL` selections are named locally from their spec (no fetch).
 * - `SPEC` selections are fetched from the movement detail endpoint, which
 *   carries the seeded spec's name.
 *
 * Returns null when no movement is selected, or while a SPEC lookup is still
 * loading, so callers can treat "no name" as "nothing to show yet".
 */
export function useSelectedMovementName(
  selectedMovement: SelectedMovement | null,
  gameType: GameType,
): string | null {
  const isSpec = selectedMovement?.source === "SPEC";

  const { data } = useSWR<MovementDetailResult>(
    isSpec ? swrKeys.movementDetail(gameType, selectedMovement.specId) : null,
    fetcher,
  );

  if (!selectedMovement) return null;

  if (selectedMovement.source === "MITCHELL") {
    return mitchellName(selectedMovement.mitchell);
  }

  return data?.name ?? null;
}
