"use client";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { SectionManagerContainer } from "@/components/manage/sections/SectionManagerContainer";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
  },
  ["tables", "movements"] as const,
);

export function SetupGamePage() {
  const { game } = useRequiredGame();

  const { step, goTo } = useFlow(
    setupGameFlow,
    {},
    `/game/${game.gameId}/create`,
  );

  if (step === "tables") {
    return <ShowTablesPage onSelectMovement={() => goTo("movements")} />;
  }

  if (step === "movements") {
    // Sections & per-section movement selection.
    return (
      <GamePageLayout
        headerTitle="Sections & Movements"
        backAction={() => goTo("tables")}
      >
        <SectionManagerContainer gameId={game.gameId} />
      </GamePageLayout>
    );
  }
}
