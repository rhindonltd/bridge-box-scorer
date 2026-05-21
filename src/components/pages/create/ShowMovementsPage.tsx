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

export function ShowMovementsPage() {
  const { gameSelection } = useGame();

  const tables = gameSelection?.tables;

  const {
    data: individualMovements,
    error: individualError,
    isLoading: individualLoading,
  } = useSWR<IndividualMovementSpec[], Error>(
    tables ? `/api/movements/individual/${tables}` : null,
    fetcher,
  );

  const {
    data: pairMovements,
    error: pairError,
    isLoading: pairLoading,
  } = useSWR<PairMovementSpec[], Error>(
    tables ? `/api/movements/pairs/${tables}` : null,
    fetcher,
  );

  const {
    data: teamMovements,
    error: teamError,
    isLoading: teamLoading,
  } = useSWR<TeamMovementSpec[], Error>(
    tables ? `/api/movements/teams/${tables}` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  if (individualLoading || pairLoading || teamLoading) {
    return <div>Loading movements...</div>;
  }

  if (individualError || pairError || teamError) {
    return <div>Failed to load movements.</div>;
  }

  function onMovementSelected(id: number, type: string) {
    if (!gameSelection) {
      return;
    }

    console.log("Movement selected: " + id);

    getSocket().emit(SocketEvents.SELECT_MOVEMENT, {
      gameId: gameSelection.gameId,
      type,
      id,
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(individualMovements ?? []).map((movement) => (
        <MovementCard
          key={`${movement.type}-${movement.id}`}
          movement={movement}
          onSelected={(id) => onMovementSelected(id, "INDIVIDUAL")}
        />
      ))}
      {(pairMovements ?? []).map((movement) => (
        <MovementCard
          key={`${movement.type}-${movement.id}`}
          movement={movement}
          onSelected={(id) => onMovementSelected(id, "PAIRS")}
        />
      ))}
      {(teamMovements ?? []).map((movement) => (
        <MovementCard
          key={`${movement.type}-${movement.id}`}
          movement={movement}
          onSelected={(id) => onMovementSelected(id, "TEAMS")}
        />
      ))}
    </div>
  );
}
