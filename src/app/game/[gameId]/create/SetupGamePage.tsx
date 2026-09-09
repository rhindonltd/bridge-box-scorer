"use client";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { HeaderMenu, type HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { SectionManagerContainer } from "@/components/manage/sections/SectionManagerContainer";
import { TimerSetup } from "@/app/game/[gameId]/manage/timer/TimerSetup";

/** The ordered steps of the game setup flow. */
export type SetupStep = "tables" | "movements" | "timer";

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

  const menuItems: HeaderMenuItem[] = [
    { label: "Tables", onSelect: () => goTo("tables"), active: activeStep === "tables" },
    {
      label: "Movement",
      onSelect: () => goTo("movements"),
      active: activeStep === "movements",
    },
    { label: "Timer", onSelect: () => goTo("timer"), active: activeStep === "timer" },
  ];

  const menu = <HeaderMenu items={menuItems} label="Setup menu" />;

  if (step === "tables") {
    return <ShowTablesPage menu={menu} />;
  }

  if (step === "movements") {
    // Sections & per-section movement selection. The container fills the
    // remaining height and owns its own scrolling so its fixed header (Add
    // Section banner etc.) doesn't scroll away.
    return (
      <GamePageLayout headerTitle="Sections & Movements" headerRight={menu}>
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1">
            <SectionManagerContainer gameId={game.gameId} />
          </div>
        </div>
      </GamePageLayout>
    );
  }

  // Optional timer configuration. Reuses the shared TimerSetup embedded;
  // configuring a timer here is never required to start the game.
  return (
    <GamePageLayout headerTitle="Timer" headerRight={menu}>
      <TimerSetup embedded />
    </GamePageLayout>
  );
}
