"use client";

import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec } from "@/db/movements/schema";
import { RecommendedMovementCard } from "@/app/game/[gameId]/create/RecommendedMovementCard";
import {
  RecommendedMovement,
  RecommendedMovementSpecRef,
} from "@/movement/recommendations/recommendation-types";
import { SelectedMovement } from "@/model/selected-movement";
import { recommendationsFromSpecMap } from "@/movement/recommendations/spec-map-recommendations";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import {
  MovementByTable,
  generatedToMovementByTable,
} from "@/movement/movementData";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import {
  setSectionMitchellMovement,
  setSectionMovementSpec,
} from "@/lib/section-service";

/**
 * Whether a recommendation resolves to the same concrete movement as the
 * section's persisted selection.
 *
 * - Seeded (DB) specs match on their numeric id.
 * - Generated Mitchells match on the defining spec fields (size, rounds,
 *   boards-per-round, arrow switches, and the variant flag), which together
 *   uniquely identify the movement a recommendation produces.
 */
function movementMatchesSelection(
  specRef: RecommendedMovementSpecRef,
  selected: SelectedMovement | null,
): boolean {
  if (!selected) return false;

  if (selected.source === "SPEC") {
    return specRef.source === "db" && specRef.id === selected.specId;
  }

  if (specRef.source !== "generated") return false;

  const a = specRef.spec;
  const b = selected.mitchell;
  return (
    a.tables === b.tables &&
    a.rounds === b.rounds &&
    a.boardsPerRound === b.boardsPerRound &&
    (a.arrowSwitchRounds ?? 0) === (b.arrowSwitchRounds ?? 0) &&
    !!a.skip === !!b.skip &&
    !!a.shareAndRelay === !!b.shareAndRelay &&
    !!a.hesitation === !!b.hesitation &&
    !!a.web === !!b.web
  );
}

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

  // The movement being previewed in the popup. Selecting a card sets this; it
  // is only persisted once the director confirms with "Select Movement".
  const [preview, setPreview] = useState<RecommendedMovement | null>(null);
  const [saving, setSaving] = useState(false);

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
    </div>
  );
}

/**
 * Popup showing the full table/round breakdown for the previewed movement, with
 * a Close action (dismiss) and a "Select Movement" action (persist and close).
 * Open when `movement` is non-null. The details content — including its data
 * fetch — is mounted only while open, so no request runs for a closed dialog.
 */
function MovementPreviewDialog({
  movement,
  saving,
  onClose,
  onConfirm,
}: {
  movement: RecommendedMovement | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (movement: RecommendedMovement) => void;
}) {
  return (
    <Transition show={movement != null} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {movement && (
                <MovementPreviewContent
                  movement={movement}
                  saving={saving}
                  onClose={onClose}
                  onConfirm={() => onConfirm(movement)}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * Contents of the movement-preview popup. Generated Mitchells are previewed
 * client-side; seeded (DB) specs are fetched from the detail API. Mounted only
 * while the dialog is open so its fetch is scoped to an open popup.
 */
function MovementPreviewContent({
  movement,
  saving,
  onClose,
  onConfirm,
}: {
  movement: RecommendedMovement;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // DB-based movements need their full layout fetched. Generated Mitchells are
  // computed locally from the spec, so no request is made for them. The shared
  // fetcher already unwraps the `{ result }` success envelope, so `detail` is
  // the inner `{ type, tables }` payload.
  const { data: detail } = useSWR<{ type: string; tables: MovementByTable[] }>(
    movement.specRef.source === "db"
      ? `/api/movements/detail/PAIRS/${movement.specRef.id}`
      : null,
    fetcher,
  );

  const previewTables = useMemo<MovementByTable[] | null>(() => {
    if (movement.specRef.source === "generated") {
      try {
        return generatedToMovementByTable(
          generateMitchell(movement.specRef.spec),
        );
      } catch {
        return null;
      }
    }
    return detail?.tables ?? null;
  }, [movement, detail]);

  return (
    <>
      <div className="shrink-0 border-b border-gray-200">
        <Dialog.Title className="text-md font-bold text-gray-800 bg-gray-300">
          {movement.name}
        </Dialog.Title>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {previewTables ? (
          <MovementDetailView tables={previewTables} />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-3 border-t p-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 rounded-xl bg-gray-100 py-3 text-md font-bold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving || !previewTables}
          className="flex-1 rounded-xl bg-green-700 py-3 text-md font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Selecting…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
