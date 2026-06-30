"use client";

import { LeaderboardPage } from "@/components/pages/leaderboard/LeaderboardPage";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LeaderboardRoute() {
  const { game } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!game) {
      router.replace("/join/select-game");
    }
  }, [game, router]);

  if (!game) {
    return null;
  }

  return (
    <LeaderboardPage
      overallScoreAndParticipant={{
        type: "TEAM_OVERALL",
        participants: [
          {
            type: "TEAM",
            id: "1",
            pair1: {
              type: "PAIR",
              player1: {
                id: 1,
                firstName: "David",
                lastName: "Collier",
                nationalId: "404476",
              },
              player2: {
                id: 2,
                firstName: "Jacqui",
                lastName: "Collier",
                nationalId: "477484",
              },
              initialSeat: "1NS",
            },
            pair2: {
              type: "PAIR",
              player1: {
                id: 3,
                firstName: "Peter",
                lastName: "Collier",
                nationalId: "123456",
              },
              player2: {
                id: 4,
                firstName: "Nye",
                lastName: "Collier",
                nationalId: "654321",
              },
              initialSeat: "1EW",
            },
          },
        ],
        overallScore: {
          mode: "TEAM",
          scoring: "OVERALL",
          type: "TEAM_OVERALL",
          lines: [
            {
              tied: false,
              rank: 1,
              teamId: "1",
              score: 100,
            },
          ],
        },
      }}
      onNext={function (): void {
        throw new Error("Function not implemented.");
      }}
    />
  );
}
