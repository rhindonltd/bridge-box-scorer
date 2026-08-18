"use client";

import { ShowTablesPage } from "./ShowTablesPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useGame } from "@/context/GameContext";
import { ShowRecommendedMovementsPage } from "./ShowRecommendedMovementsPage";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
  },
  ["tables", "movements"] as const,
);

export function SetupGamePage() {
  const { game } = useGame();
  const { step, goTo } = useFlow(setupGameFlow, {}, `/create/${game?.gameId}`);

  if (!game) {
    return null;
  }

  if (step === "tables") {
    return <ShowTablesPage onStartGame={() => goTo("movements")} />;
  }

  if (step === "movements") {
    return (
      <ShowRecommendedMovementsPage onShowTablesPage={() => goTo("tables")} />
    );
  }
}
