"use client";

import { useState, useMemo } from "react";
import { useRequiredGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { PairMovementSpec } from "@/db/movements/schema";
import { selectMovement, selectMitchellMovement } from "@/lib/game-service";
import { MovementDetailView } from "@/components/movement/MovementDetailView";
import { MovementByTable } from "@/movement/movementData";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { RecommendedMovementCard } from "@/app/game/[gameId]/create/RecommendedMovementCard";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { generateMitchell } from "@/movement/mitchell/mitchell";
import { RecommendedMovement } from "@/movement/recommendations/recommendation-types";
import { recommendationsFromSpecMap } from "@/movement/recommendations/spec-map-recommendations";

type Props = {
  onShowTablesPage: () => void;
};

type SelectedMovement = {
  id: number;
  type: string;
  name: string;
};

export function ShowMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useRequiredGame();

  const [selected, setSelected] = useState<SelectedMovement | null>(null);
  const [mitchellSpec, setMitchellSpec] = useState<MitchellMovementSpec | null>(
    null,
  );

  const tables = game.tables;
  const gameType = game.gameType;

  const isPairs = gameType === "PAIRS";
  const isTeams = gameType === "TEAMS";

  const { data: pairMovements } = useSWR<PairMovementSpec[]>(
    isPairs ? `/api/movements/pairs/${tables}` : null,
    fetcher,
  );

  // Fetch full movement detail when a DB-based movement is selected.
  const { data: movementDetail } = useSWR<{
    type: string;
    tables: MovementByTable[];
  }>(
    selected && selected.type !== "MITCHELL"
      ? `/api/movements/detail/${selected.type}/${selected.id}`
      : null,
    fetcher,
  );

  // Recommended movements: curated advice resolved against what the system can
  // actually run (generated Mitchell options + seeded pairs specs), ordered by
  // boards a pair plays.
  const recommendations = useMemo<RecommendedMovement[]>(() => {
    if (!isPairs) return [];
    return recommendationsFromSpecMap(tables, pairMovements ?? []);
  }, [isPairs, tables, pairMovements]);

  // Mitchell preview generated client-side.
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

  function handleMitchellSelected(name: string, spec: MitchellMovementSpec) {
    setSelected({ id: -1, type: "MITCHELL", name });
    setMitchellSpec(spec);
  }

  function handleRecommendationSelected(movement: RecommendedMovement) {
    if (movement.specRef.source === "generated") {
      handleMitchellSelected(movement.name, movement.specRef.spec);
    } else {
      handleMovementClicked(
        movement.specRef.id,
        movement.specRef.type,
        movement.name,
      );
    }
  }

  function handleSelect() {
    if (!selected) return;
    if (selected.type === "MITCHELL" && mitchellSpec) {
      selectMitchellMovement(game!.gameId, mitchellSpec);
    } else {
      selectMovement(game!.gameId, selected.id, selected.type);
    }
    setSelected(null);
    // Selecting a movement only persists the choice; return to the tables view
    // where the director seats pairs and starts the game.
    onShowTablesPage();
  }

  // Show detail view when a movement is selected.
  if (selected && (movementDetail || mitchellPreview)) {
    const detailData =
      selected.type === "MITCHELL" ? mitchellPreview : movementDetail;
    if (!detailData) return null;
    return (
      <GamePageLayout
        headerTitle={selected.name}
        backHref={`/create/${game.gameId}`}
        actions={
          <div className="p-3 border-t">
            <button
              onClick={handleSelect}
              className="w-full py-3 text-lg font-bold bg-green-700 text-white rounded-xl hover:bg-green-800 transition"
            >
              Use Movement
            </button>
          </div>
        }
      >
        <MovementDetailView tables={detailData.tables as MovementByTable[]} />
      </GamePageLayout>
    );
  }

  // Show loading state while DB-based detail is being fetched.
  if (selected && selected.type !== "MITCHELL" && !movementDetail) {
    return (
      <GamePageLayout headerTitle="Select Movement" backAction={onShowTablesPage}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </GamePageLayout>
    );
  }

  return (
    <GamePageLayout headerTitle="Select Movement" backAction={onShowTablesPage}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isPairs && (
            <RecommendedSection
              recommendations={recommendations}
              onSelect={handleRecommendationSelected}
            />
          )}

          {isTeams && (
            <div>
              <SectionHeading title="Teams Movements" />
              <p className="text-gray-500 text-sm italic px-1">
                Recommended teams movements are coming soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}

/* ---- Recommended section ---- */

function RecommendedSection({
  recommendations,
  onSelect,
}: {
  recommendations: RecommendedMovement[];
  onSelect: (movement: RecommendedMovement) => void;
}) {
  return (
    <div>
      <SectionHeading title="Recommended Movements" />
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
              onSelect={() => onSelect(movement)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="text-lg font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
      {title}
    </h2>
  );
}
