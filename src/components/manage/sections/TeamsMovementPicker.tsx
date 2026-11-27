"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Check } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import {
  teamsMovementOptions,
  type TeamsCatalogMovementSummary,
  type TeamsMovementOption,
  type TeamsMovementRef,
} from "@/modules/movement-catalog";
import type { SelectedMovement } from "@/model/selected-movement";
import {
  setSectionAmericanWhistTeamsMovement,
  setSectionCirculationTeamsMovement,
  setSectionTeamsMovementSpec,
} from "@/lib/section-service";
import { errorMessage } from "@/lib/error-message";
import { MovementPreviewDialog } from "./MovementPreviewDialog";

/** A teams option as the preview dialog takes it. */
interface TeamsPreview {
  name: string;
  specRef: TeamsMovementRef;
  option: TeamsMovementOption;
}

/**
 * The movement list for a Teams (not Swiss Teams) game: American Whist (for an
 * odd number of teams) and Circulation (for four teams) at a range of boards
 * per round, and the teams library's
 * movements for the section's team count, grouped by how many boards each
 * team plays. Selecting a card opens its preview; "Select Movement" saves it.
 */
export function TeamsMovementPicker({
  gameId,
  section,
  tables,
  selectedMovement,
  onSelected,
}: {
  gameId: string;
  section: string;
  /** The section's table count, which is its team count. */
  tables: number;
  selectedMovement: SelectedMovement | null;
  onSelected: () => void;
}) {
  const { data: library } = useSWR<TeamsCatalogMovementSummary[]>(
    swrKeys.teamsMovements(tables),
    fetcher,
  );
  const [preview, setPreview] = useState<TeamsPreview | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(
    () =>
      library
        ? groupByBoardsPerTeam(teamsMovementOptions(tables, library))
        : [],
    [tables, library],
  );

  async function handleConfirm({ option }: TeamsPreview) {
    setSaving(true);
    try {
      if (option.ref.source === "americanWhist") {
        await setSectionAmericanWhistTeamsMovement(
          gameId,
          section,
          option.ref.spec,
        );
      } else if (option.ref.source === "circulation") {
        await setSectionCirculationTeamsMovement(
          gameId,
          section,
          option.ref.spec,
        );
      } else {
        await setSectionTeamsMovementSpec(
          gameId,
          section,
          option.ref.id,
          option.boardsPerRound,
        );
      }
      setPreview(null);
      onSelected();
    } catch (err) {
      alert(errorMessage(err, "Failed to set movement"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      {library && groups.length === 0 ? (
        <p className="text-gray-500 text-sm italic px-1">
          No teams movements are available for {tables} tables.
        </p>
      ) : (
        <div className="space-y-4">
          {groups.map(({ boardsPerTeam, options }) => (
            <section
              key={boardsPerTeam}
              className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
            >
              <h2 className="border-b border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                {boardsPerTeam} boards
              </h2>
              <div className="grid gap-3 p-3 md:grid-cols-2">
                {options.map((option) => (
                  <TeamsMovementCard
                    key={optionKey(option.ref)}
                    option={option}
                    selected={isSelected(option.ref, selectedMovement)}
                    onSelect={() =>
                      setPreview({
                        name: option.name,
                        specRef: option.ref,
                        option,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

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

/** A stable key for an option's card. */
function optionKey(ref: TeamsMovementRef): string {
  switch (ref.source) {
    case "americanWhist":
      return `aw-${ref.spec.boardsPerRound}`;
    case "circulation":
      return `circulation-${ref.spec.boardsPerRound}`;
    case "library":
      return `library-${ref.id}`;
  }
}

/** Whether an option is the section's selected movement. */
function isSelected(
  ref: TeamsMovementRef,
  selected: SelectedMovement | null,
): boolean {
  switch (ref.source) {
    case "americanWhist":
      return (
        selected?.source === "AMERICAN_WHIST_TEAMS" &&
        selected.americanWhistTeams.boardsPerRound === ref.spec.boardsPerRound
      );
    case "circulation":
      return (
        selected?.source === "CIRCULATION_TEAMS" &&
        selected.circulationTeams.boardsPerRound === ref.spec.boardsPerRound
      );
    case "library":
      return selected?.source === "TEAMS_SPEC" && selected.specId === ref.id;
  }
}

/** Group options by the boards a team plays, fewest first. */
function groupByBoardsPerTeam(
  options: TeamsMovementOption[],
): { boardsPerTeam: number; options: TeamsMovementOption[] }[] {
  const byBoards = new Map<number, TeamsMovementOption[]>();
  for (const option of options) {
    byBoards.set(option.boardsPerTeam, [
      ...(byBoards.get(option.boardsPerTeam) ?? []),
      option,
    ]);
  }
  return [...byBoards.entries()]
    .sort(([a], [b]) => a - b)
    .map(([boardsPerTeam, group]) => ({ boardsPerTeam, options: group }));
}

function TeamsMovementCard({
  option,
  selected,
  onSelect,
}: {
  option: TeamsMovementOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid="teams-movement-card"
      data-selected={selected}
      aria-pressed={selected}
      className={`flex w-full flex-col overflow-hidden rounded-xl border text-left shadow-sm
        transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
        ${
          selected
            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1"
            : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-md active:scale-[0.98] active:bg-gray-50"
        }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b px-4 py-2.5 ${
          selected
            ? "border-blue-200 bg-blue-100"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <h3 className="text-base font-bold text-gray-900">{option.name}</h3>
        {selected && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Selected
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
        <Stat label="Rounds" value={option.rounds} />
        <Stat label="Boards / Round" value={option.boardsPerRound} />
        <Stat label="Boards in Play" value={option.boardsInPlay} />
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-2">
      <div className="text-base font-semibold text-gray-900">{value}</div>
      <div className="text-[11px] leading-tight text-gray-500">{label}</div>
    </div>
  );
}
