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
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";

type Props = {
  onShowTablesPage: () => void;
};

export function ShowMovementsPage({ onShowTablesPage }: Props) {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  const tables = gameSelection.tables;
  const gameType = gameSelection.gameType;

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

  function onMovementSelected(id: number, type: string) {
    getSocket().emit(SocketEvents.SELECT_MOVEMENT, {
      gameId: gameSelection!.gameId,
      type,
      id,
    });
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
