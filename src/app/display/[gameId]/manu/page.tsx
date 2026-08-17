"use client";

import { useParams, useRouter } from "next/navigation";
import { DisplayMenuPage } from "@/app/display/[gameId]/manu/DisplayMenuPage";

export default function DisplayMenuRoute() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <DisplayMenuPage
      onTimerClick={() => router.push(`/display/${gameId}/timer`)}
      onLeaderboardClick={() => router.push(`/display/${gameId}/leaderboard`)}
    />
  );
}
