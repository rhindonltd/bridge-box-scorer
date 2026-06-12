"use client";

import { ShowTablesPage } from "./ShowTablesPage";
import { ShowMovementsPage } from "./ShowMovementsPage";
import { createFlow, useFlow } from "@/hooks/flow";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
  },
  ["tables", "movements"] as const,
);

export function SetupGamePage() {
  const { step, goTo } = useFlow(setupGameFlow, {}, "/join/player");

  if (step === "tables") {
    return <ShowTablesPage onShowMovementsPage={() => goTo("movements")} />;
  }

  if (step === "movements") {
    return <ShowMovementsPage onShowTablesPage={() => goTo("tables")} />;
  }
}
