"use client";

import { useState, useMemo } from "react";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec, TeamMovementSpec } from "@/db/movements/schema";
import { selectMovement, selectMitchellMovement } from "@/lib/game-service";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import { MovementByTable } from "@/movement/movementData";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { MovementSection } from "./MovementSection";
import {
  findBestBoardsPerPlayer,
  generateMitchellOptions,
} from "@/movement/mitchell/mitchell-options";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import { MitchellCard } from "./MitchellCard";

type Props = {
  onShowTablesPage: () => void;
};

type SelectedMovement = {
  id: number;
  type: string;
  name: string;
};

export function ShowRecommendedMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  const [selected, setSelected] = useState<SelectedMovement | null>(null);
  const [mitchellSpec, setMitchellSpec] = useState<MitchellMovementSpec | null>(
    null,
  );

  const boardsPerPlayer = findBestBoardsPerPlayer(game.tables);

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
    onShowTablesPage()
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
