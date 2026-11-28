"use client";

import { useState } from "react";
import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { SetupMenuPage } from "@/app/game/[gameId]/create/SetupMenuPage";
import { StartGameScreen } from "@/app/game/[gameId]/create/StartGameScreen";
import { EditEventDetailsPage } from "@/app/game/[gameId]/create/EditEventDetailsPage";
import { useRouter } from "next/navigation";
import { createFlow, useFlow } from "@/hooks/flow";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { MovementStep } from "@/components/manage/sections/MovementStep";
import { TimerSetup } from "@/app/game/[gameId]/manage/timer/TimerSetup";

/**
 * The screens of the game setup flow. "menu" is the landing page (the default,
 * with no `?step=`); the others are the pages its buttons open.
 */
export type SetupStep = "menu" | "tables" | "movements" | "timer" | "start";

const setupGameFlow = createFlow(
  {
    menu: {},
    tables: {},
    movements: {},
    // The timer is optional: it is always reachable but never required to
    // start the game.
    timer: {},
    // Start-check issues + the Start Game action.
    start: {},
  },
  ["menu", "tables", "movements", "timer", "start"] as const,
);

export function SetupGamePage() {
  const { game } = useRequiredGame();
  const router = useRouter();

  // The setup menu's "Game Details" button opens this screen —
  // the create-form options prefilled from the already-created game — rather
  // than the (blank, already-submitted) create form. Shown as an overlay step
  // here since it is not part of the setup menu's step flow.
  const [editingDetails, setEditingDetails] = useState(false);

  const { step, goTo: rawGoTo } = useFlow(
    setupGameFlow,
    {},
    `/game/${game.gameId}/create`,
  );

  const goTo = rawGoTo;

  // The step pages are reached from the setup menu page and return to it with
  // the back arrow; every setup action is a button on that menu, so none of
  // them has a hamburger.
  // Delete Game and Share Director Access are manage screens; opened from
  // setup they leave out the manage hamburger too.
  const deleteGame = () =>
    router.push(`/game/${game.gameId}/manage/delete-game?from=setup`);
  const shareAccess = () =>
    router.push(`/game/${game.gameId}/manage/share-access?from=setup`);

  // Back from Tables, Movement or Timer returns to the setup menu.
  const handleSetupBack = () => rawGoTo("menu");

  // The event-details editor overlays the whole setup flow (it is not a setup
  // menu step), so render it ahead of the step switch.
  if (editingDetails) {
    return <EditEventDetailsPage onDone={() => setEditingDetails(false)} />;
  }

  if (step === "menu") {
    // The landing page after creating a game or picking one still being set
    // up. Game Details and Share Director Access are among its buttons, so it
    // has no hamburger.
    return (
      <SetupMenuPage
        onGameDetailsClick={() => setEditingDetails(true)}
        onTablesClick={() => goTo("tables")}
        onMovementClick={() => goTo("movements")}
        onTimerClick={() => goTo("timer")}
        onStartGameClick={() => goTo("start")}
        onShareAccessClick={shareAccess}
        onDeleteGameClick={deleteGame}
      />
    );
  }

  if (step === "tables") {
    return <ShowTablesPage backAction={handleSetupBack} />;
  }

  if (step === "movements") {
    // Per-section movement selection, driven by the shared section pills. The
    // step fills the remaining height and owns its own scrolling so the pills
    // stay pinned while only the recommendations scroll.
    return (
      <GamePageLayout headerTitle="Movement" backAction={handleSetupBack}>
        {/* Selecting a movement stays on the Movement screen: the popup closes
            and the (now highlighted) selection remains visible, rather than
            jumping to another step. */}
        <MovementStep gameId={game.gameId} />
      </GamePageLayout>
    );
  }

  if (step === "start") {
    // Start-check issues (grouped by section) + the Start Game action. This
    // screen owns its own layout (header + pinned Start Game button).
    return <StartGameScreen onBack={handleSetupBack} />;
  }

  // Optional timer configuration. Reuses the shared TimerSetup embedded;
  // configuring a timer here is never required to start the game.
  return (
    <GamePageLayout headerTitle="Timer" backAction={handleSetupBack}>
      <TimerSetup embedded />
    </GamePageLayout>
  );
}
