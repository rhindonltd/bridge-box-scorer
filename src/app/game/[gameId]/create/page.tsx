"use client";

import { useParams } from "next/navigation";
import { SetupGamePage } from "@/app/game/[gameId]/create/SetupGamePage";
import { NotStartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function SetUpGameRoute() {
  const params = useParams<{ gameId: string }>();

  return (
    <NotStartedGuard gameId={params.gameId}>
      <SetupGamePage />
    </NotStartedGuard>
  );
}
