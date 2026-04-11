"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { IndividualMPPercentageTable } from "@/components/results/traveller/IndividualMPPercentageTable";
import { IndividualMPTable } from "@/components/results/traveller/IndividualMPTable";
import { IndividualMatchpointScoredTraveller } from "@/model/scored-traveller";

type Props = {
  scoredTraveller: IndividualMatchpointScoredTraveller;
};

export function IndividualMP({ scoredTraveller }: Props) {
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
        <IndividualMPPercentageTable scoredTraveller={scoredTraveller} />
      ) : (
        <IndividualMPTable scoredTraveller={scoredTraveller} />
      )}
    </div>
  );
}
