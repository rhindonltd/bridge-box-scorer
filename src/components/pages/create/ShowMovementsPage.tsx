"use client";

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

type Props = {
  onShowTablesPage: () => void;
};

export function ShowMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();

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

  if (!game) {
    return null;
  }

  function onMovementSelected(id: number, type: string) {
    selectMovement(game!.gameId, id, type);
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shouldLoadIndividual &&
          (individualMovements ?? []).map((movement) => (
            <MovementCard
              key={`${movement.type}-${movement.id}`}
              movement={movement}
              onSelected={(id) => onMovementSelected(id, "INDIVIDUAL")}
            />
          ))}

        {shouldLoadPairs &&
          (pairMovements ?? []).map((movement) => (
            <MovementCard
              key={`${movement.type}-${movement.id}`}
              movement={movement}
              onSelected={(id) => onMovementSelected(id, "PAIRS")}
            />
          ))}

        {shouldLoadTeams &&
          (teamMovements ?? []).map((movement) => (
            <MovementCard
              key={`${movement.type}-${movement.id}`}
              movement={movement}
              onSelected={(id) => onMovementSelected(id, "TEAMS")}
            />
          ))}
      </div>
      <Button value={"Show Tables"} onClick={onShowTablesPage} />
    </>
  );
}
