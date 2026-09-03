"use client";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { SetupTabs, type SetupStep } from "@/app/game/[gameId]/create/SetupTabs";
import { createFlow, useFlow } from "@/hooks/flow";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { SectionManagerContainer } from "@/components/manage/sections/SectionManagerContainer";
import { TimerSetup } from "@/app/game/[gameId]/manage/timer/TimerSetup";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
    // The timer is optional: it is always reachable but never required to
    // start the game.
    timer: {},
  },
  ["tables", "movements", "timer"] as const,
);

export function SetupGamePage() {
  const { game } = useRequiredGame();

  const { step, goTo } = useFlow(
    setupGameFlow,
    {},
    `/game/${game.gameId}/create`,
  );

  // useFlow widens the step to `string`; the flow order guarantees it is one
  // of the SetupStep values.
  const activeStep = step as SetupStep;

  const tabs = <SetupTabs active={activeStep} onSelect={goTo} />;

  if (step === "tables") {
    return <ShowTablesPage tabs={tabs} />;
  }

  if (step === "movements") {
    // Sections & per-section movement selection. The tabs stay pinned; the
    // container fills the remaining height and owns its own scrolling so its
    // fixed header (Add Section banner etc.) doesn't scroll away.
    return (
      <GamePageLayout headerTitle="Sections & Movements">
        <div className="flex h-full min-h-0 flex-col">
          {tabs}
          <div className="min-h-0 flex-1">
            <SectionManagerContainer gameId={game.gameId} />
          </div>
        </div>
      </GamePageLayout>
    );
  }

  // Optional timer configuration. Reuses the shared TimerSetup embedded beneath
  // the tab bar; configuring a timer here is never required to start the game.
  return (
    <GamePageLayout headerTitle="Timer">
      {tabs}
      <TimerSetup embedded />
    </GamePageLayout>
  );
}
