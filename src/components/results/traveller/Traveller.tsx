import {
  ScoredIndividualIMPTraveller,
  ScoredIndividualMPTraveller,
  ScoredPairIMPTraveller,
  ScoredPairMPTraveller,
  ScoredTraveller,
} from "@/model/scored-traveller";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { IndividualMPTable } from "@/components/results/traveller/IndividualMPTable";
import { IndividualIMPTable } from "@/components/results/traveller/IndividualIMPTable";
import { PairMP } from "@/components/results/traveller/PairMP";

type Props = {
  scoredTraveller: ScoredTraveller;
};

export function Traveller({ scoredTraveller }: Props) {
  switch (scoredTraveller.type) {
    case "PAIR_MP":
      return (
        <PairMP scoredTraveller={scoredTraveller as ScoredPairMPTraveller} />
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
        <IndividualIMPTable
          scoredTraveller={scoredTraveller as ScoredIndividualIMPTraveller}
        />
      );
    default:
      return null;
  }
}
