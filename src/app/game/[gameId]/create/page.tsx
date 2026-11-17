"use client";

import { useParams } from "next/navigation";
import { SetupGamePage } from "@/app/game/[gameId]/create/SetupGamePage";
import { NotStartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function SetUpGameRoute() {
  const params = useParams<{ gameId: string }>();

  return (
    // A started game has finished setup: go to the main menu, where the Start
    // Game screen also sends the director.
    <NotStartedGuard gameId={params.gameId} redirectTo="/">
      <SetupGamePage />
    </NotStartedGuard>
  );
}
