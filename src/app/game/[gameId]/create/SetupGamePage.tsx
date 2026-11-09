"use client";

import { useCallback, useRef, useState } from "react";
import { ShowTablesPage } from "@/app/game/[gameId]/create/ShowTablesPage";
import { StartGameScreen } from "@/app/game/[gameId]/create/StartGameScreen";
import { EditEventDetailsPage } from "@/app/game/[gameId]/create/EditEventDetailsPage";
import { useRouter } from "next/navigation";
import { createFlow, useFlow } from "@/hooks/flow";
import { useRequiredGame } from "@/context/GameContext";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import {
  HeaderMenu,
  type HeaderMenuItem,
} from "@/components/layout/HeaderMenu";
import { useShareDirectorAccessItem } from "@/components/game/useShareDirectorAccessItem";
import { MovementStep } from "@/components/manage/sections/MovementStep";
import { TimerSetup } from "@/app/game/[gameId]/manage/timer/TimerSetup";

/** The ordered steps of the game setup flow. */
export type SetupStep = "tables" | "movements" | "timer" | "start";

const setupGameFlow = createFlow(
  {
    tables: {},
    movements: {},
    // The timer is optional: it is always reachable but never required to
    // start the game.
    timer: {},
    // Start-check issues + the Start Game action.
    start: {},
  },
  ["tables", "movements", "timer", "start"] as const,
);

export function SetupGamePage() {
  const { game } = useRequiredGame();
  const router = useRouter();

  // The back arrow on the setup views opens the "Edit Event Details" screen —
  // the create-form options prefilled from the already-created game — rather
  // than the (blank, already-submitted) create form. Shown as an overlay step
  // here since it is not part of the setup menu's step flow.
  const [editingDetails, setEditingDetails] = useState(false);

  const { step, goTo: rawGoTo } = useFlow(
    setupGameFlow,
    {},
    `/game/${game.gameId}/create`,
  );

  // useFlow widens the step to `string`; the flow order guarantees it is one
  // of the SetupStep values.
  const activeStep = step as SetupStep;

  // The step the director was on immediately before the current one. The step
  // itself is URL-param driven and `useFlow` keeps no history, so we capture it
  // at navigation time: every in-app move goes through `goTo`, which records
  // the step being left before pushing the next one. Used by the Tables /
  // Movement / Timer back arrows so "back" returns to whichever of those three
  // the director came from, rather than always opening Edit Event Details.
  const previousStepRef = useRef<SetupStep | null>(null);

  const goTo = useCallback(
    (next: SetupStep) => {
      previousStepRef.current = activeStep;
      rawGoTo(next);
    },
    [activeStep, rawGoTo],
  );

  // Section rename/delete and the combined/separate ranking toggle now live on
  // the Tables screen (surfaced there once the game has more than one section),
  // so the setup menu no longer needs a dedicated "Manage sections" entry.
  const shareItem = useShareDirectorAccessItem(game.gameId);
  const menuItems: HeaderMenuItem[] = [
    {
      label: "Tables",
      onSelect: () => goTo("tables"),
      active: activeStep === "tables",
    },
    {
      label: "Movement",
      onSelect: () => goTo("movements"),
      active: activeStep === "movements",
    },
    {
      label: "Timer",
      onSelect: () => goTo("timer"),
      active: activeStep === "timer",
    },
    {
      label: "Start Game",
      onSelect: () => goTo("start"),
      active: activeStep === "start",
    },
    // Not a setup step either: opens the share-code screen, whose back arrow
    // returns here.
    shareItem,
    // Leaves the setup flow entirely. Not a setup step, so it never shows as
    // the active selection.
    { label: "Return to main menu", onSelect: () => router.push("/") },
  ];

  const menu = <HeaderMenu items={menuItems} label="Setup menu" />;

  // Opens the editable event-details screen, prefilled from the created game —
  // so the director can review/adjust the name, type, scoring, and options they
  // set when creating, without losing anything or landing on a blank form. Used
  // as the fallback for the Tables / Movement / Timer back arrows (see
  // handleSetupBack).
  const openEditDetails = () => setEditingDetails(true);

  // Back-arrow action for the three interchangeable setup screens (Tables,
  // Movement, Timer). Going "back" from any of them returns to whichever of
  // the other two the director was last on — so arriving at Movement from
  // Tables makes back return to Tables. When the previous screen was not one of
  // these three (e.g. they arrived straight from creating the game, or came
  // from Start), there is no sibling screen to return to, so it falls back to
  // Edit Event Details.
  //
  // A back-arrow jump is itself navigation, but it deliberately does NOT record
  // a new "previous step" — it uses rawGoTo and clears the ref — so a second
  // back always exits to Edit Event Details rather than bouncing back and forth
  // between the same two screens.
  //
  // The handler reads `previousStepRef` only when the arrow is tapped (never
  // during render), so it always sees the step most recently left.
  const handleSetupBack = useCallback(
    (current: SetupStep) => {
      const previous = previousStepRef.current;
      const siblings: SetupStep[] = ["tables", "movements", "timer"];
      if (previous && previous !== current && siblings.includes(previous)) {
        previousStepRef.current = null;
        rawGoTo(previous);
      } else {
        openEditDetails();
      }
    },
    [rawGoTo],
  );

  // The event-details editor overlays the whole setup flow (it is not a setup
  // menu step), so render it ahead of the step switch.
  if (editingDetails) {
    return <EditEventDetailsPage onDone={() => setEditingDetails(false)} />;
  }

  if (step === "tables") {
    return (
      <ShowTablesPage
        menu={menu}
        onEditMovement={() => goTo("movements")}
        backAction={() => handleSetupBack("tables")}
      />
    );
  }

  if (step === "movements") {
    // Per-section movement selection, driven by the shared section pills. The
    // step fills the remaining height and owns its own scrolling so the pills
    // stay pinned while only the recommendations scroll.
    return (
      <GamePageLayout
        headerTitle="Movement"
        headerRight={menu}
        backAction={() => handleSetupBack("movements")}
      >
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
    return <StartGameScreen menu={menu} />;
  }

  // Optional timer configuration. Reuses the shared TimerSetup embedded;
  // configuring a timer here is never required to start the game.
  return (
    <GamePageLayout
      headerTitle="Timer"
      headerRight={menu}
      backAction={() => handleSetupBack("timer")}
    >
      <TimerSetup embedded />
    </GamePageLayout>
  );
}
