"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec } from "@/db/movements/schema";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { RecommendedMovementCard } from "@/app/game/[gameId]/create/RecommendedMovementCard";
import { RecommendedMovement } from "@/movement/recommendations/recommendation-types";
import { recommendationsFromSpecMap } from "@/movement/recommendations/spec-map-recommendations";
import {
  setSectionMitchellMovement,
  setSectionMovementSpec,
} from "@/lib/section-service";

interface Props {
  gameId: string;
  section: string;
  /** The section's table count — movements are sized to it. */
  tables: number;
  onDone: () => void;
}

/**
 * Per-section movement picker. Shows the same curated recommendations as the
 * whole-game chooser (see ShowMovementsPage), scoped to one section's table
 * count, and persists via SET_SECTION_MOVEMENT.
 */
export function SectionMovementPicker({
  gameId,
  section,
  tables,
  onDone,
}: Props) {
  // Seeded specs for this table count, used to resolve a SPEC recommendation's
  // concrete id/type at selection time (recommendations reference specs by
  // name, not id).
  const { data: pairMovements } = useSWR<PairMovementSpec[]>(
    `/api/movements/pairs/${tables}`,
    fetcher,
  );

  const recommendations = useMemo<RecommendedMovement[]>(
    () => recommendationsFromSpecMap(tables, pairMovements ?? []),
    [tables, pairMovements],
  );

  async function choose(movement: RecommendedMovement) {
    try {
      if (movement.specRef.source === "generated") {
        await setSectionMitchellMovement(gameId, section, movement.specRef.spec);
      } else {
        await setSectionMovementSpec(
          gameId,
          section,
          movement.specRef.id,
          movement.boardsPerRound,
        );
      }
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set movement");
    }
  }

  return (
    <GamePageLayout
      headerTitle={`Section ${section} — Select Movement`}
      backAction={onDone}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
            Recommended Movements
          </h2>
          {recommendations.length === 0 ? (
            <p className="text-gray-500 text-sm italic px-1">
              No recommended movements are available for this table count yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recommendations.map((movement, index) => (
                <RecommendedMovementCard
                  key={`${movement.source}-${movement.name}-${index}`}
                  movement={movement}
                  onSelect={() => choose(movement)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}
