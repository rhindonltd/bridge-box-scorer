"use client";

import SelectGameGate from "@/components/gate/SelectGameGate";
import { LeaderboardPage } from "@/components/pages/leaderboard/LeaderboardPage";
import { useGame } from "@/context/GameContext";

export default function LeaderboardRoute() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return <SelectGameGate nextRoute="/join/leaderboard" />;
  }

  return (
    <LeaderboardPage
      overallScoreAndParticipant={{
        type: "TEAM_OVERALL",
        participants: [
          {
            type: "TEAM",
            teamId: "1",
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
              direction: "NS",
              tableNumber: 1,
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
              direction: "EW",
              tableNumber: 1,
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
