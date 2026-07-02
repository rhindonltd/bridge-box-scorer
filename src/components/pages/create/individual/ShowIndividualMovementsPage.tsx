"use client";

import { useGame } from "@/context/GameContext";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { IndividualMovementSpec } from "@/db/movements/schema";
import { MovementCard } from "@/components/pages/create/MovementCard";
import { swrKeys } from "@/swr/swr-keys";
import { useState } from "react";

type Props = {
  onShowTablesPage: () => void;
};

export function ShowIndividualMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();
  const [movement, setMovement] = useState<number | null>(null);

  if (!game) {
    return null;
  }

  const key = swrKeys.individualMovements(game.tables);
  const { data } = useSWR<IndividualMovementSpec[], Error>(key, fetcher);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(data ?? []).map((movement) => (
        <MovementCard
          key={`${movement.type}-${movement.id}`}
          movement={movement}
          onSelected={setMovement}
        />
      ))}
    </div>
  );
}
