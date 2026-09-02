"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec } from "@/db/movements/schema";
import NumberStepper from "@/components/common/NumberStepper";
import { MovementCard } from "@/app/game/[gameId]/create/MovementCard";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
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
 * Per-section movement picker. Mirrors the whole-game movement UI but is scoped
 * to one section (its table count) and persists via SET_SECTION_MOVEMENT rather
 * than the legacy whole-game SELECT_MOVEMENT.
 */
export function SectionMovementPicker({
  gameId,
  section,
  tables,
  onDone,
}: Props) {
  const [boardsPerRound, setBoardsPerRound] = useState(3);

  const { data: pairMovements } = useSWR<PairMovementSpec[]>(
    `/api/movements/pairs/${tables}`,
    fetcher,
  );

  const mitchellOptions = useMemo(() => {
    if (!tables || tables < 2) return [];
    const options: { name: string; spec: MitchellMovementSpec }[] = [];
    if (tables % 2 === 1) {
      options.push({
        name: "Standard Mitchell",
        spec: { tables, rounds: tables, boardsPerRound },
      });
    } else {
      options.push({
        name: "Mitchell Share and Relay",
        spec: { tables, rounds: tables, boardsPerRound },
      });
      options.push({
        name: "Skip Mitchell",
        spec: { tables, rounds: tables, boardsPerRound, skip: true },
      });
    }
    return options;
  }, [tables, boardsPerRound]);

  async function chooseMitchell(spec: MitchellMovementSpec) {
    try {
      await setSectionMitchellMovement(gameId, section, spec);
      onDone();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set movement");
    }
  }

  async function chooseSpec(specId: number) {
    try {
      await setSectionMovementSpec(gameId, section, specId, boardsPerRound);
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-600">
            Boards per round:
          </label>
          <NumberStepper
            value={boardsPerRound}
            onChange={setBoardsPerRound}
            min={2}
          />
          <p className="text-xs text-gray-500">
            Applies to every movement below.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
            Generated Movements
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {mitchellOptions.map((option) => (
              <MitchellOptionCard
                key={option.name}
                name={option.name}
                spec={option.spec}
                onSelect={() => chooseMitchell(option.spec)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
            Pairs Movements
          </h2>
          {(pairMovements ?? []).length === 0 ? (
            <p className="text-gray-500 text-sm italic px-1">
              No movements available for this table count.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(pairMovements ?? []).map((movement) => (
                <MovementCard
                  key={`${movement.type}-${movement.id}`}
                  movement={movement}
                  onSelected={(id) => chooseSpec(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}

function MitchellOptionCard({
  name,
  spec,
  onSelect,
}: {
  name: string;
  spec: MitchellMovementSpec;
  onSelect: () => void;
}) {
  const effectiveRounds = spec.skip ? spec.tables - 1 : spec.rounds;
  const totalBoards = spec.tables * spec.boardsPerRound;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm text-left w-full
        hover:border-blue-300 hover:shadow-md active:scale-[0.98] active:bg-blue-100
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Rounds</div>
          <div className="font-medium text-gray-900">{effectiveRounds}</div>
        </div>
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Boards per Round</div>
          <div className="font-medium text-gray-900">{spec.boardsPerRound}</div>
        </div>
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Total Boards</div>
          <div className="font-medium text-gray-900">{totalBoards}</div>
        </div>
      </div>
    </button>
  );
}
