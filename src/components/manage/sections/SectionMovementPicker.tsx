"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec } from "@/db/movements/schema";
import { RecommendedMovementCard } from "@/app/game/[gameId]/create/RecommendedMovementCard";
import { RecommendedMovement } from "@/movement/recommendations/recommendation-types";
import { SelectedMovement } from "@/model/selected-movement";
import { recommendationsFromSpecMap } from "@/movement/recommendations/spec-map-recommendations";
import {
  setSectionMitchellMovement,
  setSectionMovementSpec,
  setSectionSwissMovement,
} from "@/lib/section-service";
import {
  groupByBoardsPerPair,
  movementMatchesSelection,
} from "./movement-recommendations";
import { MovementPreviewDialog } from "./MovementPreviewDialog";
import { SwissSetupDialog } from "./SwissSetupDialog";
import type { SwissMovementSpec } from "@/model/selected-movement";

interface Props {
  gameId: string;
  section: string;
  /** The section's table count — movements are sized to it. */
  tables: number;
  /**
   * The movement currently persisted for this section (null until one is
   * chosen). Used to highlight the matching recommendation card so the
   * director can see their current choice.
   */
  selectedMovement?: SelectedMovement | null;
  /**
   * Whether the game has more than one section. When false, the "Section X"
   * sub-heading is omitted since there's no section distinction to show.
   */
  multiSection?: boolean;
  /**
   * Return control to the caller (e.g. back to the sections list). When
   * omitted, the picker is the root view (single-section setup) and no back
   * control is shown. Also invoked after a movement is confirmed.
   */
  onDone?: () => void;
  /**
   * Invoked after a movement is successfully confirmed (in addition to
   * `onDone`). Lets the setup flow move on — e.g. back to the Tables step —
   * without adding a "Back to sections" control.
   */
  onSelected?: () => void;
  /**
   * When provided, show an "Add Section" button that converts a single-section
   * game into a multi-section one. Only meaningful for the single-section
   * setup case.
   */
  onAddSection?: () => void;
  /**
   * Whether the game currently has exactly one section. Swiss Pairs is a
   * single-pool movement (one field, drawn round by round), so its option is
   * shown only when true.
   */
  singleSection?: boolean;
}

/**
 * Per-section movement picker. The director browses the curated recommendations
 * for the section's table count (grouped by how many boards a pair plays), then
 * clicks one to open a popup showing its full table/round breakdown. From that
 * popup they either Close (dismiss without changing anything) or Select Movement
 * — which persists it via SET_SECTION_MOVEMENT. Clicking a card only previews;
 * nothing is committed until the confirm button.
 */
export function SectionMovementPicker({
  gameId,
  section,
  tables,
  selectedMovement = null,
  multiSection = true,
  onDone,
  onSelected,
  onAddSection,
  singleSection = false,
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

  const groups = useMemo(
    () => groupByBoardsPerPair(recommendations),
    [recommendations],
  );

  // The movement being previewed in the popup. Selecting a card sets this; it
  // is only persisted once the director confirms with "Select Movement".
  const [preview, setPreview] = useState<RecommendedMovement | null>(null);
  const [saving, setSaving] = useState(false);
  // Whether the Swiss Pairs setup dialog is open.
  const [swissOpen, setSwissOpen] = useState(false);

  const selectedSwiss =
    selectedMovement?.source === "SWISS" ? selectedMovement.swiss : null;

  async function handleConfirmSwiss(spec: SwissMovementSpec) {
    setSaving(true);
    try {
      await setSectionSwissMovement(gameId, section, spec);
      setSwissOpen(false);
      onDone?.();
      onSelected?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set movement");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm(movement: RecommendedMovement) {
    setSaving(true);
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
      setPreview(null);
      onDone?.();
      onSelected?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set movement");
    } finally {
      setSaving(false);
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
        {singleSection && (
          <section className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <h2 className="border-b border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
              Swiss
            </h2>
            <div className="p-3">
              <button
                type="button"
                onClick={() => setSwissOpen(true)}
                data-testid="swiss-movement-option"
                className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition hover:bg-white ${
                  selectedSwiss
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    Swiss Pairs
                  </span>
                  <span className="block text-xs text-gray-500">
                    Pairs are re-drawn each round by standing; you draw each
                    round as the event runs.
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-blue-600">
                  {selectedSwiss ? "Selected" : "Set up"}
                </span>
              </button>
            </div>
          </section>
        )}

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
                      selected={movementMatchesSelection(
                        movement.specRef,
                        selectedMovement,
                      )}
                      onSelect={() => setPreview(movement)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <MovementPreviewDialog
        movement={preview}
        saving={saving}
        onClose={() => {
          if (!saving) setPreview(null);
        }}
        onConfirm={handleConfirm}
      />

      <SwissSetupDialog
        open={swissOpen}
        tables={tables}
        initial={selectedSwiss}
        saving={saving}
        onCancel={() => {
          if (!saving) setSwissOpen(false);
        }}
        onConfirm={handleConfirmSwiss}
      />
    </div>
  );
}
