"use client";

import { useParams } from "next/navigation";
import { SetupGamePage } from "@/app/game/[gameId]/create/SetupGamePage";
import { NotStartedGuard } from "@/app/game/[gameId]/manage/StateGuards";
import { DirectorGuard } from "@/app/game/[gameId]/manage/DirectorGuard";

export default function SetUpGameRoute() {
  const params = useParams<{ gameId: string }>();

  return (
    // The server must confirm this device is a director: a token left in
    // storage can be out of date, and every setup action would then fail.
    <DirectorGuard gameId={params.gameId}>
      {/* A started game has finished setup: go to the main menu, where the
          Start Game screen also sends the director. */}
      <NotStartedGuard gameId={params.gameId} redirectTo="/">
        <SetupGamePage />
      </NotStartedGuard>
    </DirectorGuard>
  );
}
