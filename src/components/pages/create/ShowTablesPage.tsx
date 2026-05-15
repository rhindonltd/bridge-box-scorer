"use client";

import ShowTables from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";

export function ShowTablesPage() {
  const { gameSelection } = useGame();

  return (
    <>
      {gameSelection === null ? null : (
        <ShowTables tables={gameSelection.tables} />
      )}
    </>
  );
}
