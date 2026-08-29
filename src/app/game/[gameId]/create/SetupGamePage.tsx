"use client";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { ShowMovementsPage } from "@/app/game/[gameId]/create/ShowMovementsPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useGame } from "@/context/GameContext";

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

  if (step === "tables") {
    return <ShowTablesPage onStartGame={() => goTo("movements")} />;
  }

  if (step === "movements") {
    return <ShowMovementsPage onShowTablesPage={() => goTo("tables")} />;
  }
}
