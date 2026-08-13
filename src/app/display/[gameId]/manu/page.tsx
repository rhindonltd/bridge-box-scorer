"use client";

import { DisplayMenuPage } from "@/components/pages/display/DisplayMenuPage";
import { useParams, useRouter } from "next/navigation";

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
