"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec } from "@/db/movements/schema";
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
  /**
   * Whether the game has more than one section. When false, the "Section X"
   * sub-heading is omitted since there's no section distinction to show.
   */
  multiSection?: boolean;
  /**
   * Return control to the caller (e.g. back to the sections list). When
   * omitted, the picker is the root view (single-section setup) and no back
   * control is shown.
   */
  onDone?: () => void;
  /**
   * When provided, show an "Add Section" button that converts a single-section
   * game into a multi-section one. Only meaningful for the single-section
   * setup case.
   */
  onAddSection?: () => void;
}

/**
 * Per-section movement picker. Shows the curated recommendations for the
 * section's table count, grouped by how many boards a pair plays, and persists
 * the chosen movement via SET_SECTION_MOVEMENT.
 */
export function SectionMovementPicker({
  gameId,
  section,
  tables,
  multiSection = true,
  onDone,
  onAddSection,
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

  // Group movements by how many boards a pair plays, ascending. This is the
  // natural way a director compares options (session length), so it replaces
  // the flat list and the per-card "Boards a Pair Plays" stat.
  const groups = useMemo(() => {
    const byBoards = new Map<number, RecommendedMovement[]>();
    for (const movement of recommendations) {
      const existing = byBoards.get(movement.boardsPerPair);
      if (existing) {
        existing.push(movement);
      } else {
        byBoards.set(movement.boardsPerPair, [movement]);
      }
    }
    return Array.from(byBoards.entries())
      .sort(([a], [b]) => a - b)
      .map(([boardsPerPair, movements]) => ({ boardsPerPair, movements }));
  }, [recommendations]);

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
      onDone?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set movement");
    }
  }

  return (
    // Rendered inside SetupGamePage's GamePageLayout (header + setup tabs), so
    // this view provides only its own content — no nested page header.
    // Fills the bounded height given by the setup layout: the header row and
    // Add Section banner stay pinned while only the recommendations scroll.
    <div className="flex h-full min-h-0 flex-col">
      {(onDone || multiSection) && (
        <div className="flex shrink-0 items-center gap-3 px-4 pt-4">
          {onDone && (
            <button
              type="button"
              onClick={onDone}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to sections
            </button>
          )}
          {multiSection && (
            <h2 className="text-lg font-bold text-gray-800">
              Section {section}
            </h2>
          )}
        </div>
      )}

      {onAddSection && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="text-sm text-amber-800">
            Running more than one section?
          </p>
          <button
            type="button"
            onClick={onAddSection}
            className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-500 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Add Section
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <p className="text-gray-500 text-sm italic px-1">
            No recommended movements are available for this table count yet.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map(({ boardsPerPair, movements }) => (
              <section
                key={boardsPerPair}
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
              >
                <h2 className="border-b border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                  {boardsPerPair} boards
                </h2>
                <div className="grid gap-3 p-3 md:grid-cols-2">
                  {movements.map((movement, index) => (
                    <RecommendedMovementCard
                      key={`${movement.source}-${movement.name}-${index}`}
                      movement={movement}
                      onSelect={() => choose(movement)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
