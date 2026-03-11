import { RankedPairResultRow } from "@/model/ranks";
import { PairLeaderboard } from "@/components/results/PairLeaderboard";

export default function ResultsPage() {
  const rows = [
    {
      pairId: "1",
      totalNs: 10,
      totalEw: 12,
      percentage: 51.25,
      travellerType: "MP",
      rank: 1,
    },
  ] as RankedPairResultRow[];

  return (
    <>
      <PairLeaderboard results={rows} />
    </>
  );
}
