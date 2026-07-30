"use client";

import { useState } from "react";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  IndividualMovementSpec,
  PairMovementSpec,
  TeamMovementSpec,
} from "@/db/movements/schema";
import { MovementCard } from "@/components/pages/create/MovementCard";
import Button from "@/components/common/Button";
import { selectMovement } from "@/lib/game-service";
import {
  MovementDetailView,
  MovementTableData,
} from "@/components/movement/MovementDetailView";

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

  const [selected, setSelected] = useState<SelectedMovement | null>(null);

  const tables = game?.tables ?? 0;
  const gameType = game?.gameType;

  const shouldLoadIndividual = gameType === "INDIVIDUAL";
  const shouldLoadPairs = gameType === "PAIRS";
  const shouldLoadTeams = gameType === "PAIRS";

  const { data: individualMovements } = useSWR<IndividualMovementSpec[]>(
    shouldLoadIndividual ? `/api/movements/individual/${tables}` : null,
    fetcher,
  );

  const { data: pairMovements } = useSWR<PairMovementSpec[]>(
    shouldLoadPairs ? `/api/movements/pairs/${tables}` : null,
    fetcher,
  );

  const { data: teamMovements } = useSWR<TeamMovementSpec[]>(
    shouldLoadTeams ? `/api/movements/teams/${tables}` : null,
    fetcher,
  );

  // Fetch full movement detail when one is selected
  const { data: movementDetail } = useSWR<{
    type: string;
    tables: MovementTableData[];
  }>(
    selected
      ? `/api/movements/detail/${selected.type}/${selected.id}`
      : null,
    fetcher,
  );

  if (!game) {
    return null;
  }

  function handleMovementClicked(
    id: number,
    type: string,
    name: string,
  ) {
    setSelected({ id, type, name });
  }

  function handleSelect() {
    if (!selected) return;
    selectMovement(game!.gameId, selected.id, selected.type);
    setSelected(null);
  }

  function handleBack() {
    setSelected(null);
  }

  // Show detail view when a movement is selected
  if (selected && movementDetail) {
    return (
      <div className="h-full">
        <MovementDetailView
          movementName={selected.name}
          movementType={selected.type}
          tables={movementDetail.tables}
          onBack={handleBack}
          onSelect={handleSelect}
        />
      </div>
    );
  }

  // Show loading state while detail is being fetched
  if (selected && !movementDetail) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Movement list view
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-4">
        {shouldLoadIndividual &&
          (individualMovements ?? []).map((movement) => (
            <MovementCard
              key={`${movement.type}-${movement.id}`}
              movement={movement}
              onSelected={(id) =>
                handleMovementClicked(id, "INDIVIDUAL", movement.name)
              }
            />
          ))}

        {shouldLoadPairs &&
          (pairMovements ?? []).map((movement) => (
            <MovementCard
              key={`${movement.type}-${movement.id}`}
              movement={movement}
              onSelected={(id) =>
                handleMovementClicked(id, "PAIRS", movement.name)
              }
            />
          ))}

        {shouldLoadTeams &&
          (teamMovements ?? []).map((movement) => (
            <MovementCard
              key={`${movement.type}-${movement.id}`}
              movement={movement}
              onSelected={(id) =>
                handleMovementClicked(id, "TEAMS", movement.name)
              }
            />
          ))}
      </div>
      <div className="p-4">
        <Button value={"Show Tables"} onClick={onShowTablesPage} />
      </div>
    </>
  );
}
