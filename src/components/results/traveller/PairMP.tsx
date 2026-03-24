"use client";

import { ScoredPairMPTraveller } from "@/model/scored-traveller";
import { PairMPTable } from "@/components/results/traveller/PairMPTable";
import { PairMPPercentageTable } from "@/components/results/traveller/PairMPPercentageTable";
import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";

type Props = {
  scoredTraveller: ScoredPairMPTraveller;
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
