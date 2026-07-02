"use client";

import { useGame } from "@/context/GameContext";
import { PairMovementSpec, TeamMovementSpec } from "@/db/movements/schema";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { useState } from "react";
import useSWR from "swr";
import { MovementCard } from "../MovementCard";
import { Toggle } from "@/components/common/Toggle";

type Props = {
  onShowTablesPage: () => void;
};

export function ShowPairsMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();
  const [type, setType] = useState<string>("PAIRS");
  const [movement, setMovement] = useState<number | null>(null);

  if (!game) {
    return null;
  }

  const key =
    type == "TEAMS"
      ? swrKeys.pairMovements(game.tables)
      : swrKeys.teamMovements(game.tables);
  const { data } = useSWR<PairMovementSpec[] | TeamMovementSpec[], Error>(
    key,
    fetcher,
  );

  return (
      <>
          <Toggle value={type == 'PAIRS'} offLabel={"PAIRS"} onLabel={"TEAMS"} onSwitch={function(): void {
              type == 'PAIRS' ? setType('TEAMS') : setType('PAIRS')
          } } />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(data ?? []).map((movement) => (
        <MovementCard
          key={`${movement.type}-${movement.id}`}
          movement={movement}
          onSelected={setMovement}
        />
      ))}
    </div>
          </>
  );
}
