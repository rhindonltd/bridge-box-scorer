"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { GameType } from "@/db/games/types/game-type";
import type { SelectedMovement } from "@/model/selected-movement";
import type { MovementByTable } from "@/movement/movementData";
import { generateMitchell } from "@/movement/mitchell/mitchell";

/** Which directions of a table stay put for the whole movement. */
export interface StationaryDirections {
  ns: boolean;
  ew: boolean;
}

type MovementDetailResult = {
  type: GameType;
  tables: MovementByTable[];
};

/** True when `label` is defined and identical across every round. */
function isConstant(labels: (string | undefined)[]): boolean {
  if (labels.length === 0) return false;
  const first = labels[0];
  if (first == null) return false;
  return labels.every((l) => l === first);
}

/**
 * Build the stationary map from per-table rounds: a direction is stationary
 * when its pair label is the same in every round for that table.
 */
function stationaryFromTables(
  tables: {
    tableNumber: number;
    rounds: { ns?: string; ew?: string }[];
  }[],
): Map<number, StationaryDirections> {
  const map = new Map<number, StationaryDirections>();
  for (const table of tables) {
    map.set(table.tableNumber, {
      ns: isConstant(table.rounds.map((r) => r.ns)),
      ew: isConstant(table.rounds.map((r) => r.ew)),
    });
  }
  return map;
}

/**
 * Determine which pair positions are "stationary" (stay at the same table for
 * every round) for a section's selected movement, keyed by table number.
 *
 * - `MITCHELL` selections are generated locally (no fetch).
 * - `SPEC` selections are fetched from the movement detail endpoint.
 *
 * Returns an empty map when no movement is selected, while a SPEC lookup is
 * loading/errored, or when the movement can't be built — so callers can treat
 * "not present" as "not stationary".
 */
export function useStationaryPairs(
  selectedMovement: SelectedMovement | null,
  gameType: GameType,
): Map<number, StationaryDirections> {
  const isSpec = selectedMovement?.source === "SPEC";

  const { data } = useSWR<MovementDetailResult>(
    isSpec ? swrKeys.movementDetail(gameType, selectedMovement.specId) : null,
    fetcher,
  );

  if (!selectedMovement) {
    return new Map();
  }

  if (selectedMovement.source === "MITCHELL") {
    try {
      const generated = generateMitchell(selectedMovement.mitchell);
      return stationaryFromTables(
        generated.tables.map((t) => ({
          tableNumber: t.table,
          rounds: t.rounds.map((r) => ({
            ns: r.participants.nsId,
            ew: r.participants.ewId,
          })),
        })),
      );
    } catch {
      return new Map();
    }
  }

  // SPEC: computed from the fetched detail (empty until it loads).
  if (!data) {
    return new Map();
  }
  return stationaryFromTables(data.tables);
}
