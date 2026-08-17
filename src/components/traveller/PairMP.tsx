"use client";

import { PairMPTable } from "@/components/traveller/PairMPTable";
import { PairMPPercentageTable } from "@/components/traveller/PairMPPercentageTable";
import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";

type Props = {
  scoredTraveller: ScoredTravellerOfType<"PAIR_MP">;
};

export function PairMP({ scoredTraveller }: Props) {
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
        <PairMPPercentageTable scoredTraveller={scoredTraveller} />
      ) : (
        <PairMPTable scoredTraveller={scoredTraveller} />
      )}
    </div>
  );
}
