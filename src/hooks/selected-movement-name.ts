"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { storedMovementDetailKey } from "@/swr/swr-keys";
import type { SelectedMovement } from "@/model/selected-movement";
import type { MitchellMovementSpec } from "@/modules/movement-catalog";

type MovementDetailResult = {
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
  if (spec.americanWhist) return "American Whist";
  return "Standard Mitchell";
}

/**
 * Resolve a section's selected movement into its display name.
 *
 * - `MITCHELL` selections are named locally from their spec (no fetch).
 * - `SPEC` and `TEAMS_SPEC` selections (a pairs or teams library movement)
 *   are fetched from the movement's detail endpoint, which carries its name.
 *
 * Returns null when no movement is selected, or while a SPEC lookup is still
 * loading, so callers can treat "no name" as "nothing to show yet".
 */
export function useSelectedMovementName(
  selectedMovement: SelectedMovement | null,
): string | null {
  const { data } = useSWR<MovementDetailResult>(
    storedMovementDetailKey(selectedMovement),
    fetcher,
  );

  if (!selectedMovement) return null;

  if (selectedMovement.source === "MITCHELL") {
    return mitchellName(selectedMovement.mitchell);
  }

  if (selectedMovement.source === "SWISS") {
    return "Swiss Pairs";
  }

  if (selectedMovement.source === "AMERICAN_WHIST_TEAMS") {
    return "American Whist";
  }
  if (selectedMovement.source === "CIRCULATION_TEAMS") {
    return "Circulation";
  }
  if (selectedMovement.source === "THURNER_TEAMS") {
    return "Thurner";
  }
  if (selectedMovement.source === "STAGGER_TEAMS") {
    return "Stagger";
  }

  return data?.name ?? null;
}
