"use client";

import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { createFlow, useFlow } from "@/hooks/flow";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { HeaderMenu, type HeaderMenuItem } from "@/components/layout/HeaderMenu";
import { MovementStep } from "@/components/manage/sections/MovementStep";
import { ManageSectionsScreen } from "@/components/manage/sections/ManageSectionsScreen";
import { TimerSetup } from "@/app/game/[gameId]/manage/timer/TimerSetup";

/** The ordered steps of the game setup flow. */
export type SetupStep = "tables" | "movements" | "timer" | "manage-sections";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
    // The timer is optional: it is always reachable but never required to
    // start the game.
    timer: {},
    // Section rename/delete (and add). Reachable any time from the menu.
    "manage-sections": {},
  },
  ["tables", "movements", "timer", "manage-sections"] as const,
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
    {
      label: "Manage sections",
      onSelect: () => goTo("manage-sections"),
      active: activeStep === "manage-sections",
    },
  ];

  const menu = <HeaderMenu items={menuItems} label="Setup menu" />;

  if (step === "tables") {
    return <ShowTablesPage menu={menu} />;
  }

  if (step === "movements") {
    // Per-section movement selection, driven by the shared section pills. The
    // step fills the remaining height and owns its own scrolling so the pills
    // stay pinned while only the recommendations scroll.
    return (
      <GamePageLayout headerTitle="Sections & Movements" headerRight={menu}>
        <MovementStep gameId={game.gameId} />
      </GamePageLayout>
    );
  }

  if (step === "manage-sections") {
    // Rename / delete / add sections. Movement is chosen on the Movement step,
    // so this list shows no movement controls.
    return (
      <GamePageLayout headerTitle="Manage Sections" headerRight={menu}>
        <div className="flex h-full min-h-0 flex-col">
          <ManageSectionsScreen gameId={game.gameId} />
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
