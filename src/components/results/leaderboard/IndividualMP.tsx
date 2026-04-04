"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { OverallIndividualMPScore } from "@/model/leaderboard";
import { IndividualMPLeaderboard } from "@/components/results/leaderboard/IndividualMPLeaderboard";
import { IndividualMPPercentageLeaderboard } from "@/components/results/leaderboard/IndividualMPPercentageLeaderboard";
import { IndividualAssignment } from "@/model/participants";

type Props = {
  individuals: IndividualAssignment[];
  leaderboard: OverallIndividualMPScore;
};

export function IndividualMP({ individuals, leaderboard }: Props) {
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
        <IndividualMPPercentageLeaderboard
          individuals={individuals}
          leaderboard={leaderboard}
        />
      ) : (
        <IndividualMPLeaderboard
          individuals={individuals}
          leaderboard={leaderboard}
        />
      )}
    </div>
  );
}
