import {
  IndividualMatchpointScoredTraveller,
  IndividualXIMPScoredTraveller,
  PairMatchpointScoredTraveller,
  PairXIMPScoredTraveller,
  ScoredTraveller,
} from "@/model/scored-traveller";
import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { IndividualIMPTable } from "@/components/results/traveller/IndividualIMPTable";
import { PairMP } from "@/components/results/traveller/PairMP";
import { IndividualMP } from "@/components/results/traveller/IndividualMP";

type Props = {
  scoredTraveller: ScoredTraveller;
};

export function Traveller({ scoredTraveller }: Props) {
  switch (scoredTraveller.type) {
    case "PAIR_MP":
      return (
        <PairMP
          scoredTraveller={scoredTraveller as PairMatchpointScoredTraveller}
        />
      );
    case "PAIR_XIMP":
      return (
        <PairIMPTable
          scoredTraveller={scoredTraveller as PairXIMPScoredTraveller}
        />
      );
    case "INDIVIDUAL_MP":
      return (
        <IndividualMP
          scoredTraveller={
            scoredTraveller as IndividualMatchpointScoredTraveller
          }
        />
      );
    case "INDIVIDUAL_XIMP":
      return (
        <IndividualIMPTable
          scoredTraveller={scoredTraveller as IndividualXIMPScoredTraveller}
        />
      );
    default:
      return null;
  }
}
