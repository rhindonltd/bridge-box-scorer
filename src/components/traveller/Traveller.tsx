import { PairMP } from "@/components/traveller/PairMP";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PairXIMPTable } from "./PairXIMPTable";

type Props = {
  scoredTraveller: ScoredTraveller;
};

export function Traveller({ scoredTraveller }: Props) {
  switch (scoredTraveller.type) {
    case "PAIR_MP":
      return <PairMP scoredTraveller={scoredTraveller} />;
    case "PAIR_XIMP":
      return <PairXIMPTable scoredTraveller={scoredTraveller} />;
    default:
      return null;
  }
}
