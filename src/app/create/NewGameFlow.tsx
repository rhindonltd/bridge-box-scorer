"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { CreateGamePage } from "@/app/create/CreateGamePage";
import { SetupMenuPage } from "@/app/game/[gameId]/create/SetupMenuPage";
import { useBackNavigation } from "@/hooks/useBackNavigation";

const MENU_HREF = "/create/new";
const DETAILS_HREF = "/create/new?step=details";

/**
 * New Game: the Set Up Game menu for a game that doesn't exist yet. Only Game
 * Details is available. It opens the details form, and saving that creates the
 * game and moves on to its own Set Up Game menu with everything unlocked.
 *
 * The form has its own URL (`?step=details`) so the phone's back button returns
 * from it to this menu, as the header's back arrow does.
 */
export function NewGameFlow() {
  const router = useRouter();
  const editing = useSearchParams().get("step") === "details";
  const { onBack } = useBackNavigation(MENU_HREF);

  if (editing) return <CreateGamePage onBack={onBack} />;

  return (
    <SetupMenuPage draft onGameDetailsClick={() => router.push(DETAILS_HREF)} />
  );
}
