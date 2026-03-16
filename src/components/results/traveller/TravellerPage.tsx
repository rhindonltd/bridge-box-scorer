import {
  ScoredIndividualIMPTraveller,
  ScoredIndividualMPTraveller,
  ScoredPairIMPTraveller,
  ScoredPairMPTraveller,
  ScoredTraveller,
} from "@/model/scored-traveller";
import { PairMPTable } from "@/components/results/traveller/PairMPTable";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { IndividualMPTable } from "@/components/results/traveller/IndividualMPTable";

type Props = {
  scoredTraveller: ScoredTraveller;
};

export function TravellerPage({ scoredTraveller }: Props) {
  switch (scoredTraveller.type) {
    case "PAIR_MP":
      return (
        <PairMPTable
          scoredTraveller={scoredTraveller as ScoredPairMPTraveller}
        />
      );
    case "PAIR_IMP":
      return (
        <PairIMPTable
          scoredTraveller={scoredTraveller as ScoredPairIMPTraveller}
        />
      );
    case "INDIVIDUAL_MP":
      return (
        <IndividualMPTable
          scoredTraveller={scoredTraveller as ScoredIndividualMPTraveller}
        />
      );
    case "INDIVIDUAL_IMP":
      return (
        <IndividualIMPGroup
          scoredTraveller={scoredTraveller as ScoredIndividualIMPTraveller}
        />
      );
    default:
      return null;
  }
}

type IndividualIMPProps = {
  scoredTraveller: ScoredIndividualIMPTraveller;
};

function IndividualIMPGroup({ scoredTraveller }: IndividualIMPProps) {
  return <></>;
}
