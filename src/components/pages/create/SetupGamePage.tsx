"use client";

import { ShowTablesPage } from "./ShowTablesPage";
import { ShowMovementsPage } from "./ShowMovementsPage";
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

  if (!game) {
    return null;
  }

  if (step === "tables") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <ShowTablesPage onShowMovementsPage={() => goTo("movements")} />
        </div>
      </div>
    );
  }

  if (step === "movements") {
    return <ShowMovementsPage onShowTablesPage={() => goTo("tables")} />;
  }
}
