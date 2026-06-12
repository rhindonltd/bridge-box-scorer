"use client";

import { useRouter } from "next/navigation";

import { JoinMenuPage } from "@/components/pages/join/JoinMenuPage";

export default function JoinMenu() {
  const router = useRouter();

  function joinAsPlayer() {
    router.push("/join/player");
  }

  function showTimer() {
    router.push("/join/timer");
  }

  function showLeaderboard() {
    router.push("/join/leaderboard");
  }

  return (
    <div style={{ margin: "0 auto" }}>
      <JoinMenuPage
        onJoinAsPlayer={joinAsPlayer}
        onShowTimer={showTimer}
        onShowLeaderboard={showLeaderboard}
      />
    </div>
  );
}
