import { PairMP } from "@/components/results/traveller/PairMP";
import { IndividualMP } from "@/components/results/traveller/IndividualMP";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PairXIMPTable } from "./PairXIMPTable";
import { IndividualXIMPTable } from "./IndividualXIMPTable";

type Props = {
  scoredTraveller: ScoredTraveller;
};

export function Traveller({ scoredTraveller }: Props) {
  switch (scoredTraveller.type) {
    case "PAIR_MP":
      return <PairMP scoredTraveller={scoredTraveller} />;
    case "PAIR_XIMP":
      return <PairXIMPTable scoredTraveller={scoredTraveller} />;
    case "INDIVIDUAL_MP":
      return <IndividualMP scoredTraveller={scoredTraveller} />;
    case "INDIVIDUAL_XIMP":
      return <IndividualXIMPTable scoredTraveller={scoredTraveller} />;
    default:
      return null;
  }
}
