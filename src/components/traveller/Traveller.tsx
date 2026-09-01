import { PairMP } from "@/components/traveller/PairMP";
import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { PairXIMPTable } from "./PairXIMPTable";

type Props = {
  scoredTraveller: ScoredTraveller;
  /**
   * When set, the row(s) where this pair appears (as NS or EW) are highlighted.
   * This is the pair's assignment id.
   */
  highlightAssignmentId?: string;
};

export function Traveller({ scoredTraveller, highlightAssignmentId }: Props) {
  switch (scoredTraveller.type) {
    case "PAIR_MP":
      return (
        <PairMP
          scoredTraveller={scoredTraveller}
          highlightAssignmentId={highlightAssignmentId}
        />
      );
    case "PAIR_XIMP":
      return (
        <PairXIMPTable
          scoredTraveller={scoredTraveller}
          highlightAssignmentId={highlightAssignmentId}
        />
      );
    default:
      return null;
  }
}
