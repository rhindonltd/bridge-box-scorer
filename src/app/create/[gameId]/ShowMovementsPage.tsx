"use client";

import { useState, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec, TeamMovementSpec } from "@/db/movements/schema";
import { selectMovement, selectMitchellMovement } from "@/lib/game-service";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import NumberStepper from "@/components/common/NumberStepper";
import { MovementByTable } from "@/movement/movementData";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { MovementSection } from "./MovementSection";
import {
  findBestBoardsPerPlayer,
  generateMitchellOptions,
} from "@/movement/mitchell/mitchell-options";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { generateMitchell } from "@/movement/mitchell/mitchell";

type Props = {
  onShowTablesPage: () => void;
};

type SelectedMovement = {
  id: number;
  type: string;
  name: string;
};

export function ShowMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  const [selected, setSelected] = useState<SelectedMovement | null>(null);
  const [boardsPerPlayer, setBoardsPerPlayer] = useState(
    findBestBoardsPerPlayer(game.tables),
  );
  const [mitchellSpec, setMitchellSpec] = useState<MitchellMovementSpec | null>(
    null,
  );

  const tables = game.tables ?? 0;
  const gameType = game.gameType;

  const shouldLoadPairs = gameType === "PAIRS";
  const shouldLoadTeams = gameType === "TEAMS";

  const { data: pairMovements } = useSWR<PairMovementSpec[]>(
    shouldLoadPairs ? `/api/movements/pairs/${tables}` : null,
    fetcher,
  );

  const { data: teamMovements } = useSWR<TeamMovementSpec[]>(
    shouldLoadTeams ? `/api/movements/teams/${tables}` : null,
    fetcher,
  );

  // Fetch full movement detail when one is selected (DB-based)
  const { data: movementDetail } = useSWR<{
    type: string;
    tables: MovementByTable[];
  }>(
    selected && selected.type !== "MITCHELL"
      ? `/api/movements/detail/${selected.type}/${selected.id}`
      : null,
    fetcher,
  );

  // Mitchell options based on table count
  const mitchellOptions = useMemo(() => {
    if (!tables || tables < 2) return [];

    return generateMitchellOptions(tables, boardsPerPlayer);
  }, [tables, boardsPerPlayer]);

  // Mitchell preview generated client-side
  const mitchellPreview = useMemo(() => {
    if (selected?.type !== "MITCHELL" || !mitchellSpec) return null;
    try {
      const generated = generateMitchell(mitchellSpec);
      return {
        type: "PAIRS",
        tables: generated.tables.map((t) => ({
          tableNumber: t.table,
          rounds: t.rounds.map((r) => ({
            roundNumber: r.round,
            ns: r.participants.nsId,
            ew: r.participants.ewId,
            boardStart: r.boards[0],
            boardEnd: r.boards[r.boards.length - 1],
          })),
        })),
      };
    } catch {
      return null;
    }
  }, [selected, mitchellSpec]);

  if (!game) {
    return null;
  }

  function handleMovementClicked(id: number, type: string, name: string) {
    setSelected({ id, type, name });
    setMitchellSpec(null);
  }

  function handleMitchellSelected(option: {
    name: string;
    spec: MitchellMovementSpec;
  }) {
    setSelected({ id: -1, type: "MITCHELL", name: option.name });
    setMitchellSpec(option.spec);
  }

  function handleSelect() {
    if (!selected) return;
    if (selected.type === "MITCHELL" && mitchellSpec) {
      selectMitchellMovement(game!.gameId, mitchellSpec);
    } else {
      selectMovement(game!.gameId, selected.id, selected.type);
    }
    setSelected(null);
  }

  // Show detail view when a movement is selected
  if (selected && (movementDetail || mitchellPreview)) {
    const detailData =
      selected.type === "MITCHELL" ? mitchellPreview : movementDetail;
    if (!detailData) return null;
    return (
      <GamePageLayout
        headerTitle={selected.name}
        backHref={`/create/${game.gameId}`}
        children={
          <MovementDetailView tables={detailData.tables as MovementByTable[]} />
        }
        actions={
          handleSelect && (
            <div className="p-3 border-t">
              <button
                onClick={handleSelect}
                className="w-full py-3 text-lg font-bold bg-green-700 text-white rounded-xl hover:bg-green-800 transition"
              >
                Use Movement
              </button>
            </div>
          )
        }
      />
    );
  }

  // Show loading state while detail is being fetched (DB-based only)
  if (selected && selected.type !== "MITCHELL" && !movementDetail) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Movement list view — grouped by type with section headings
  return (
    <GamePageLayout
      headerTitle="Select Movement"
      backAction={onShowTablesPage}
      children={
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {shouldLoadPairs && (
              <div>
                <div className="mb-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold text-gray-600">
                      Boards per player:
                    </label>
                    <NumberStepper
                      value={boardsPerPlayer}
                      onChange={setBoardsPerPlayer}
                      min={1}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  {mitchellOptions.map((option) => (
                    <MitchellCard
                      key={option.name}
                      name={option.name}
                      spec={option.spec}
                      onSelect={() => handleMitchellSelected(option)}
                    />
                  ))}
                </div>
              </div>
            )}

            {shouldLoadPairs && (
              <MovementSection
                movements={pairMovements ?? []}
                type="PAIRS"
                onSelect={handleMovementClicked}
              />
            )}

            {shouldLoadTeams && (
              <MovementSection
                movements={teamMovements ?? []}
                type="TEAMS"
                onSelect={handleMovementClicked}
              />
            )}
          </div>
        </div>
      }
    />
  );
}

/* ---- Mitchell Card component ---- */

function MitchellCard({
  name,
  spec,
  onSelect,
}: {
  name: string;
  spec: MitchellMovementSpec;
  onSelect: () => void;
}) {
  const totalBoards = spec.tables * spec.boardsPerRound;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm text-left w-full
        hover:border-blue-300 hover:shadow-md
        active:scale-[0.98] active:bg-blue-100
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
    >
      <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg bg-white p-2 text-center">
          <div className="text-xs text-gray-500">Rounds</div>
          <div className="font-medium text-gray-900">{spec.rounds}</div>
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
