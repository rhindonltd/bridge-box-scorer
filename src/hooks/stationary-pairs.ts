"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/fetcher";
import { storedMovementDetailKey } from "@/swr/swr-keys";
import type {
  SelectedMovement,
  SwissMovementSpec,
} from "@/model/selected-movement";
import { swissPairHomeSeat } from "@/modules/swiss";
import {
  fixedMovementSetup,
  americanWhistPreview,
  circulationSetOut,
  generatedToMovementByTable,
  generateMitchell,
  type MovementByTable,
  type MovementResolution,
  type StationaryDirections,
  type TablePlacement,
} from "@/modules/movement-catalog";

type MovementDetailResult = {
  tables: MovementByTable[];
};

const EMPTY: MovementResolution = {
  stationary: new Map(),
  placement: new Map(),
  movementTables: 0,
};

/**
 * Resolve a Swiss selection into per-table setup facts. Stationary directions
 * come from the director's designated pairs (each pair id maps to a round-1
 * home table + direction); round-1 board placement is boards `1..boardsPerRound`
 * at every table (all tables play the same set). Gated on the Swiss table count
 * matching the section, like the other movements.
 */
function swissResolution(
  swiss: SwissMovementSpec,
  sectionTables: number,
): MovementResolution {
  const movementTables = swiss.tables;
  if (movementTables !== sectionTables) {
    return { stationary: new Map(), placement: new Map(), movementTables };
  }

  const stationary = new Map<number, StationaryDirections>();
  for (let t = 1; t <= movementTables; t++) {
    stationary.set(t, { ns: false, ew: false });
  }
  for (const pairId of swiss.stationaryPairs ?? []) {
    const home = swissPairHomeSeat(movementTables, pairId);
    const dirs = stationary.get(home.tableNumber);
    if (dirs) {
      if (home.direction === "NS") dirs.ns = true;
      else dirs.ew = true;
    }
  }

  const placement = new Map<number, TablePlacement>();
  for (let t = 1; t <= movementTables; t++) {
    placement.set(t, { boardStart: 1, boardEnd: swiss.boardsPerRound });
  }

  return { stationary, placement, movementTables };
}

/**
 * Resolve a section's selected movement into per-table setup facts: stationary
 * pair positions and board placement (round-1 boards, physical copy, and any
 * share/relay), keyed by table number.
 *
 * - `MITCHELL`, `AMERICAN_WHIST_TEAMS` and `CIRCULATION_TEAMS` selections are
 *   generated locally (no fetch).
 * - `SPEC` and `TEAMS_SPEC` selections (a pairs or teams library movement)
 *   are fetched from the movement's detail endpoint.
 *
 * Everything is gated on the movement's table count matching `sectionTables`:
 * on a mismatch (e.g. the director resized the section away from the movement's
 * size) both maps are empty. Returns empty maps when no movement is selected or
 * while a SPEC lookup is loading/errored, so callers can treat "not present" as
 * "no information".
 */
export function useMovementResolution(
  selectedMovement: SelectedMovement | null,
  sectionTables: number,
): MovementResolution {
  const { data } = useSWR<MovementDetailResult>(
    storedMovementDetailKey(selectedMovement),
    fetcher,
  );

  if (!selectedMovement) {
    return EMPTY;
  }

  // Swiss: stationary positions are the director's designated pairs (not
  // derived from a schedule, which doesn't exist up front). Round-1 boards are
  // the same set at every table. Both are computed directly from the selection.
  if (selectedMovement.source === "SWISS") {
    return swissResolution(selectedMovement.swiss, sectionTables);
  }

  let tables: MovementByTable[];
  let shareAndRelay = false;

  if (selectedMovement.source === "MITCHELL") {
    try {
      tables = generatedToMovementByTable(
        generateMitchell(selectedMovement.mitchell),
      );
      shareAndRelay = selectedMovement.mitchell.shareAndRelay === true;
    } catch {
      return EMPTY;
    }
  } else if (selectedMovement.source === "AMERICAN_WHIST_TEAMS") {
    // Generated locally; the selection only allows a team count it suits.
    tables = americanWhistPreview(selectedMovement.americanWhistTeams);
  } else if (selectedMovement.source === "CIRCULATION_TEAMS") {
    // Generated locally. Each table starts on its own share of the round's
    // boards, so that share is what is set out on it.
    tables = circulationSetOut(selectedMovement.circulationTeams);
  } else {
    // SPEC / TEAMS_SPEC: computed from the fetched detail (empty until it
    // loads). Seeded specs never carry a provable relay, so shareAndRelay
    // stays false.
    if (!data) {
      return EMPTY;
    }
    tables = data.tables;
  }

  return fixedMovementSetup(tables, { shareAndRelay, sectionTables });
}
