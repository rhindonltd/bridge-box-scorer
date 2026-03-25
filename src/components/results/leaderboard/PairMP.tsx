"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { OverallPairMPScore } from "@/model/leaderboard";
import { PairMPPercentageLeaderboard } from "@/components/results/leaderboard/PairMPPercentageLeaderboard";
import { PairMPLeaderboard } from "@/components/results/leaderboard/PairMPLeaderboard";

type Props = {
  leaderboard: OverallPairMPScore;
};

export function PairMP({ leaderboard }: Props) {
  const [showPercentage, setShowPercentage] = useState(true);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toggle (fixed at top) */}
      <div className="flex justify-end">
        <Toggle
          value={showPercentage}
          offLabel={"MP"}
          onLabel={"%"}
          onSwitch={() => setShowPercentage(!showPercentage)}
        />
      </div>

      {/* Scrollable table */}
      {showPercentage ? (
        <PairMPPercentageLeaderboard leaderboard={leaderboard} />
      ) : (
        <PairMPLeaderboard leaderboard={leaderboard} />
      )}
    </div>
  );
}
