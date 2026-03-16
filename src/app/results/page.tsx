import { PairMPLeaderboard } from "@/components/results/overall/PairMPLeaderboard";
import { PairMPResult } from "@/model/overall-result";

export default function ResultsPage() {
  const rows = [
    {
      pairId: "1",
      totalMP: 100,
      boardsPlayed: 24,
      percentage: 53.99,
      players: [
        {
          firstName: "Jacqui",
          lastName: "Collier",
        },
        {
          firstName: "David",
          lastName: "Collier",
        },
      ],
    },
  ] as PairMPResult[];

  return (
    <>
      <PairMPLeaderboard results={rows} />
    </>
  );
}
