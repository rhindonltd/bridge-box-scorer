"use client";

import DirectorTableControls, {
  DirectorTable,
} from "@/components/tables/DirectorTableControls";
import { useRequiredGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { ClientSection } from "@/hooks/sections";
import { Pair, Seat } from "@/model/participants";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { errorMessage } from "@/lib/error-message";
import { useSetupSections } from "@/components/manage/sections/useSetupSections";
import { useCombinedRanking } from "@/components/manage/sections/useCombinedRanking";
import {
  updateSectionTables,
  setSectionSwissMovement,
  renameSection,
  deleteSection,
} from "@/lib/section-service";
import { reportError } from "@/lib/report-error";
import { Toggle } from "@/components/common/Toggle";
import { SectionTablesHeader } from "@/components/tables/SectionTablesHeader";
import { evictParticipant } from "@/lib/participant-service";
import {
  setParticipantStanding,
  setSeatExpectedLate,
  type StandingChange,
} from "@/lib/standing-service";
import { useGameStarted } from "@/hooks/game-started";
import { useMovementResolution } from "@/hooks/stationary-pairs";
import { useSelectedMovementName } from "@/hooks/selected-movement-name";
import { DirectorTableModal } from "@/components/tables/DirectorTableModal";
import { buildDirectorTable } from "./build-director-table";
import { useId, useMemo, useState, type ReactNode } from "react";

/** Unwrap the `{ pairs }` envelope the pairs endpoint returns. */
async function pairsFetcher(url: string): Promise<Pair[]> {
  const response: { pairs: Pair[] } = await fetcher(url);
  return response.pairs;
}

// Unwrap the `{ seats }` envelope into the plain seat-string array. We keep it
// as an array (not a Set) in the SWR cache on purpose: SWR's default `compare`
// hashes its data to decide whether a change warrants a re-render, and that
// hash does NOT serialise Set contents — two different Sets compare as equal,
// so an optimistic flip would update the cache without re-rendering bound
// hooks (the open table dialog then showed stale expected-late state until it
// was closed and reopened). An array hashes by its contents, so the flip
// re-renders. The component converts it to a Set for membership checks.
async function expectedLateFetcher(url: string): Promise<string[]> {
  const response: { seats: string[] } = await fetcher(url);
  return response.seats;
}

type Props = {
  /** Setup navigation menu rendered in the header's right-hand slot. */
  menu?: ReactNode;
  /** Navigate to the movement-selection step (e.g. from the movement banner). */
  onEditMovement?: () => void;
  /** Back-arrow action — returns to the create form. Omit to hide the arrow. */
  backAction?: () => void;
};

export function ShowTablesPage({ menu, onEditMovement, backAction }: Props) {
  const { game } = useRequiredGame();
  const { mutate } = useSWRConfig();

  const gameId = game.gameId;

  const key = swrKeys.pairs(gameId);

  const { data: pairs } = useSWR<Pair[], Error>(key, pairsFetcher);

  // Whether the game is in progress. Pre-start the table dialog offers evict /
  // expected-late; post-start it offers EBU §2.4 standing changes instead.
  const { started } = useGameStarted(gameId);

  // The empty seats marked "expected late" (§2.4.7), as a seat-string array
  // (see expectedLateFetcher for why it is not a Set in the cache). Not pushed
  // over a socket, so it is read over HTTP and re-mutated after a late toggle.
  const { data: expectedLateSeatList } = useSWR<string[], Error>(
    swrKeys.expectedLateSeats(gameId),
    expectedLateFetcher,
  );

  // A Set for cheap membership checks when building the table view-models. The
  // identity only changes when the seat list's contents change, so the `tables`
  // memo below correctly recomputes on a flip.
  const expectedLateSeats = useMemo(
    () => new Set(expectedLateSeatList ?? []),
    [expectedLateSeatList],
  );

  const { sections, selected, setSelected, pills, modal } = useSetupSections(
    gameId,
    {
      // Sections are fixed once the game has started: no adding or splitting
      // mid-event. (Swiss is single-section at any time.)
      allowAddSection: !started && game.eventFormat !== "SWISS",
    },
  );

  // A single-section event has nothing to disambiguate, so the movement prompt
  // drops the "for this section" qualifier that only makes sense when several
  // sections each need their own movement. It also gates the per-section
  // management controls (rename/delete) and the combined-ranking toggle, which
  // are only meaningful once the game has been split into more than one section.
  const multiSection = sections.length > 1;

  // The per-game "combined vs separate ranking across sections" setting. Only
  // surfaced for a multi-section game (a single section is always effectively
  // combined), rendered as a slim row under the pills.
  const combinedRankingLabelId = useId();
  const { combined, setCombined } = useCombinedRanking(gameId);

  // The table whose management dialog (evict / stationary) is open, or null.
  const [openTable, setOpenTable] = useState<DirectorTable | null>(null);

  // The Tables view shows one section at a time (selected via the pills); its
  // table-count stepper is pinned above the scroll area.
  const currentSection = sections.find((s) => s.section === selected);

  // Resolve the selected section's movement into per-table setup facts:
  // stationary pair positions and board placement (round-1 boards, copy,
  // share/relay). Both are empty until a movement is chosen/loaded, and both
  // are suppressed when the section's table count doesn't match the movement's
  // — so a resized section never shows stale guidance.
  const {
    stationary: stationaryPairs,
    placement,
    movementTables,
  } = useMovementResolution(
    currentSection?.selectedMovement ?? null,
    game.gameType,
    currentSection?.tables ?? 0,
  );

  // Movement warning for the currently-selected section:
  //  - no movement chosen yet, or
  //  - a movement is chosen but its table count no longer matches the section
  //    as laid out (resized away from the movement's size).
  // `movementTables` is 0 when nothing is resolved (no movement, or a SPEC
  // lookup still loading), so we only flag a mismatch once it is known (> 0).
  const noMovement =
    !!currentSection && currentSection.selectedMovement == null;
  const invalidMovement =
    !!currentSection &&
    currentSection.selectedMovement != null &&
    movementTables > 0 &&
    movementTables !== currentSection.tables;
  const showMovementWarning = noMovement || invalidMovement;

  // Display name of the section's selected movement (null when none is chosen
  // or a SPEC lookup is still loading). Shown as a clickable summary so the
  // director sees their choice and can jump back to change it.
  const selectedMovementName = useSelectedMovementName(
    currentSection?.selectedMovement ?? null,
    game.gameType,
  );

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId),
      data: p.participants,
    }),
    [gameId],
  );

  // The director-table view-models for the selected section, rebuilt when the
  // section, its size, the seated pairs, or the resolved movement facts change.
  const tables = useMemo<DirectorTable[]>(() => {
    if (!currentSection) return [];
    const lateSeats = expectedLateSeats ?? new Set<string>();
    return Array.from({ length: currentSection.tables }, (_, i) =>
      buildDirectorTable(
        currentSection.section,
        i + 1,
        pairs,
        stationaryPairs,
        placement,
        lateSeats,
      ),
    );
  }, [currentSection, pairs, stationaryPairs, placement, expectedLateSeats]);

  async function handleResizeSection(section: string, tables: number) {
    const sectionsKey = swrKeys.sections(gameId);

    // Optimistically reflect the new table count in the sections cache so the
    // grid updates instantly instead of flickering at the old size until the
    // server round-trip + broadcast lands. `revalidate: false` keeps our
    // optimistic value until we choose to reconcile.
    void mutate(
      sectionsKey,
      (current?: { sections: ClientSection[] }) =>
        current
          ? {
              sections: current.sections.map((s) =>
                s.section === section ? { ...s, tables } : s,
              ),
            }
          : current,
      { revalidate: false },
    );

    try {
      await updateSectionTables(gameId, section, tables);
      // Success: the server broadcasts the authoritative section list, which
      // revalidates this key and reconciles any difference.
    } catch (err) {
      // Roll back to the server's truth and surface the shrink-guard message.
      void mutate(sectionsKey);
      alert(errorMessage(err, "Failed to update tables"));
    }
  }

  // Rename the selected section (e.g. to fix a typo in the label set at add
  // time). The server broadcasts the fresh section list, which revalidates the
  // sections SWR key everywhere, so no explicit mutate is needed here.
  async function handleRenameSection(section: string, label: string) {
    try {
      await renameSection(gameId, section, label);
    } catch (err) {
      reportError(err);
    }
  }

  // Delete the selected section after confirmation. Guarded server-side (and in
  // the UI) so the last section can never be removed. On success the broadcast
  // section list drops the section; move selection to a surviving section so
  // the view never points at a section that is gone.
  async function handleDeleteSection(section: string) {
    if (!confirm(`Delete section ${section}?`)) return;
    try {
      await deleteSection(gameId, section);
      const survivor = sections.find((s) => s.section !== section);
      if (survivor) setSelected(survivor.section);
    } catch (err) {
      reportError(err);
    }
  }

  async function handleEvict(seat: Seat) {
    if (!confirm("Evict this pair from the table?")) return;

    try {
      await evictParticipant(gameId, seat);
      // The pair is gone; close the management dialog.
      setOpenTable(null);
    } catch (err) {
      alert(errorMessage(err, "Failed to evict participant"));
    }
  }

  // Change a seated pair's EBU §2.4 standing. The server re-broadcasts the
  // participant list (and leaderboard), which revalidates the pairs SWR, so no
  // explicit mutate is needed here.
  async function handleChangeStanding(seat: Seat, change: StandingChange) {
    try {
      await setParticipantStanding(gameId, seat, change);
    } catch (err) {
      alert(errorMessage(err, "Failed to update standing"));
    }
  }

  // Mark/unmark an empty seat "expected late". The toggle is a controlled
  // reflection of the expected-late SWR set, which is read over HTTP (not
  // pushed). Update that cache optimistically so the switch flips the instant
  // it is tapped — without this the switch appeared stuck until the server
  // round-trip and re-read landed — then reconcile against the server (rolling
  // back on failure).
  async function handleToggleExpectedLate(seat: Seat, next: boolean) {
    const key = swrKeys.expectedLateSeats(gameId);

    // Compute the post-toggle seat list once and use it for BOTH the optimistic
    // flip and (on success) the committed cache value. The cache holds a plain
    // array (not a Set) so SWR's content hash sees the change and re-renders
    // bound hooks — the open table dialog included.
    const applyToggle = (current?: string[]) => {
      const set = new Set(current ?? []);
      if (next) {
        set.add(seat);
      } else {
        set.delete(seat);
      }
      return Array.from(set);
    };

    void mutate(key, applyToggle, { revalidate: false });

    try {
      await setSeatExpectedLate(gameId, seat, next);
      // Success: keep our just-applied value as the committed truth WITHOUT a
      // blind re-read. An immediate `mutate(key)` revalidation here races the
      // write — the GET is served by the Next route bundle while the mark was
      // written through the socket-server bundle, so the re-read can land
      // before the new row is visible and return the OLD set, snapping the
      // toggle straight back (the SETUP-3 "doesn't toggle" bug). Writing the
      // known-good set with revalidate:false leaves the flip in place; the set
      // naturally reconciles on the next organic revalidation.
      void mutate(key, applyToggle, { revalidate: false });
      // Whether the game can start depends on which empty seats are expected
      // late (one sit-out is allowed, any number of expected-late seats), and
      // nothing else tells the Start Game screen this changed — so refresh its
      // readiness check, or it keeps saying "blocked" until a page reload.
      void mutate(swrKeys.startCheck(gameId));
    } catch (err) {
      // Roll back the optimistic flip to the server's truth.
      void mutate(key);
      alert(errorMessage(err, "Failed to update expected late"));
    }
  }

  // For a Swiss section, a pair can be marked stationary (stays at its table
  // and direction for the whole event). Toggling flips the pair's id in the
  // Swiss selection's stationaryPairs and re-saves the whole spec. Only wired
  // when the current section's movement is Swiss.
  const swissSpec =
    currentSection?.selectedMovement?.source === "SWISS"
      ? currentSection.selectedMovement.swiss
      : null;

  async function handleToggleStationary(tableNumber: number, ns: boolean) {
    /* v8 ignore next -- defensive guard: the stationary toggle only renders in
       the modal when swissSpec != null, which implies currentSection != null,
       so this early-return is unreachable through the UI. */
    if (!currentSection || !swissSpec) return;

    // NS pair at table T is id T; EW pair is id tables + T.
    const pairId = ns ? tableNumber : swissSpec.tables + tableNumber;
    const current = new Set(swissSpec.stationaryPairs ?? []);
    if (current.has(pairId)) {
      current.delete(pairId);
    } else {
      current.add(pairId);
    }

    try {
      await setSectionSwissMovement(gameId, currentSection.section, {
        ...swissSpec,
        stationaryPairs: Array.from(current).sort((a, b) => a - b),
      });
    } catch (err) {
      alert(errorMessage(err, "Failed to update stationary"));
    }
  }

  return (
    <GamePageLayout
      headerTitle="Tables"
      headerRight={menu}
      backAction={backAction}
      hideBack={!backAction}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Yellow, clickable warning pinned under the header when the selected
            section has no movement, or a movement that no longer fits its table
            count. Tapping it jumps to the movement-selection step. Suppressed
            once the game has started: the movement is fixed, so there is
            nothing to act on. */}
        {!started && showMovementWarning && (
          <button
            type="button"
            onClick={() => onEditMovement?.()}
            data-testid="movement-warning-banner"
            className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-yellow-300 bg-yellow-50 px-4 py-3 text-left text-sm font-medium text-yellow-900 hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
          >
            <span>
              {noMovement
                ? multiSection
                  ? "Select a movement for this section."
                  : "Select a movement."
                : "This section’s movement no longer fits its table count. Update the movement."}
            </span>
            <span aria-hidden="true" className="shrink-0 font-semibold">
              →
            </span>
          </button>
        )}

        {/* Section pills pick which section is shown, pinned in a grey bar
            (matching the Movement step). */}
        <div className="flex shrink-0 justify-center border-b border-gray-200 bg-gray-50 px-4 py-3">
          {pills}
        </div>

        {/* Combined vs separate ranking across sections. A per-game setting, so
            it sits above the per-section card and only appears once the game
            has more than one section (a single section is always combined). */}
        {multiSection && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
            <label
              id={combinedRankingLabelId}
              className="text-sm font-semibold text-gray-700"
            >
              Combined ranking across sections
            </label>
            <Toggle
              value={combined}
              offLabel="Separate"
              onLabel="Combined"
              labelledBy={combinedRankingLabelId}
              onChange={setCombined}
            />
          </div>
        )}

        {/* Selected-movement summary. Shown when the section has a movement that
            still fits (no warning) and its name has resolved. Pre-start it is a
            button that jumps to the movement step to change the choice; once the
            game has started the movement is fixed, so it is shown as a static
            (non-clickable) line with no "Change" affordance. */}
        {!showMovementWarning &&
          selectedMovementName &&
          (started ? (
            <div
              data-testid="selected-movement-summary"
              className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700"
            >
              <span>
                <span className="text-gray-500">Movement: </span>
                <span className="font-semibold text-gray-900">
                  {selectedMovementName}
                </span>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onEditMovement?.()}
              data-testid="selected-movement-summary"
              className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span>
                <span className="text-gray-500">Movement: </span>
                <span className="font-semibold text-gray-900">
                  {selectedMovementName}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-blue-600">
                Change
              </span>
            </button>
          ))}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {currentSection && (
            // Light-grey card with a "{n} tables" header that carries the
            // +/- stepper — mirroring the movement picker's "{n} boards"
            // grouping card.
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              <SectionTablesHeader
                section={currentSection.section}
                label={currentSection.label}
                tables={currentSection.tables}
                multiSection={multiSection}
                readOnly={started}
                onResize={(t) => handleResizeSection(currentSection.section, t)}
                onRename={(label) =>
                  handleRenameSection(currentSection.section, label)
                }
                onDelete={() => handleDeleteSection(currentSection.section)}
              />
              <div className="p-3">
                <DirectorTableControls
                  tables={tables}
                  onOpenTable={setOpenTable}
                />
              </div>
            </section>
          )}
        </div>
      </div>
      {modal}
      {/* Per-table management dialog. Resolve the live table from the current
          `tables` (rebuilt on evict / stationary changes) so the dialog stays
          in sync; fall back to the opened snapshot if the table count shrank. */}
      <DirectorTableModal
        table={
          openTable
            ? (tables.find((t) => t.tableNumber === openTable.tableNumber) ??
              null)
            : null
        }
        isSwiss={swissSpec != null}
        started={started}
        onEvict={handleEvict}
        onToggleStationary={handleToggleStationary}
        onChangeStanding={handleChangeStanding}
        onToggleExpectedLate={handleToggleExpectedLate}
        // Design §11: in a board-pooled pairs event a pair withdraws itself and
        // the director chooses how its missed boards score on the Late
        // Arrivals / Withdrawals screen, so no standing control here.
        showStandingControls={
          game.gameType !== "PAIRS" || game.eventFormat === "SWISS"
        }
        onClose={() => setOpenTable(null)}
      />
    </GamePageLayout>
  );
}
