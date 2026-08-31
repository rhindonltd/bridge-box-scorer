"use client";

import { useParams, useRouter } from "next/navigation";
import { DisplayMenuPage } from "@/app/game/[gameId]/display/DisplayMenuPage";

export default function DisplayMenuRoute() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <DisplayMenuPage
      onTimerClick={() => router.push(`/game/${gameId}/display/timer`)}
      onLeaderboardClick={() =>
        router.push(`/game/${gameId}/display/leaderboard`)
      }
    />
  );
}
