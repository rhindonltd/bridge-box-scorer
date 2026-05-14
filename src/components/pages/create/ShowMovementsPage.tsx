"use client";

import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { PairMovement } from "../../../db/games/pairs/tables/movements";
import { fetcher } from "@/lib/fetcher";
import { ShowMovements } from "@/components/create/ShowMovements";

export function ShowMovementsPage() {
  const { gameSelection } = useGame();

  const tables = gameSelection?.tables;

  const { data, error, isLoading } = useSWR<PairMovement[], Error>(
    tables ? `/api/movements/pairs/${tables}` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  if (isLoading) {
    return <div>Loading movements...</div>;
  }

  if (error) {
    return <div>Failed to load movements.</div>;
  }

  return <ShowMovements movements={data ?? []} />;
}
