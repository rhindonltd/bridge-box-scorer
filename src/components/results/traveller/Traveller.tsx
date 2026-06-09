import { PairIMPTable } from "@/components/results/traveller/PairIMPTable";
import { IndividualIMPTable } from "@/components/results/traveller/IndividualIMPTable";
import { PairMP } from "@/components/results/traveller/PairMP";
import { IndividualMP } from "@/components/results/traveller/IndividualMP";

import { ScoredTraveller } from "@/scoring/traveller/score-traveller";
import { JSX } from "react/jsx-runtime";
import { ScoredTravellerOfType } from "@/scoring/traveller/score-traveller";
import { PairXIMPTable } from "./PairXIMPTable";
import { IndividualXIMPTable } from "./IndividualXIMPTable";

type TravellerType = ScoredTraveller["type"];

type TravellerMap = {
  PAIR_MP: { scoredTraveller: ScoredTravellerOfType<"PAIR_MP"> };
  PAIR_IMP: { scoredTraveller: ScoredTravellerOfType<"PAIR_IMP"> };
  PAIR_XIMP: { scoredTraveller: ScoredTravellerOfType<"PAIR_XIMP"> };
  INDIVIDUAL_MP: { scoredTraveller: ScoredTravellerOfType<"INDIVIDUAL_MP"> };
  INDIVIDUAL_IMP: { scoredTraveller: ScoredTravellerOfType<"INDIVIDUAL_IMP"> };
  INDIVIDUAL_XIMP: {
    scoredTraveller: ScoredTravellerOfType<"INDIVIDUAL_XIMP">;
  };
};

type ComponentRegistry = {
  [K in TravellerType]: (props: TravellerMap[K]) => JSX.Element;
};

const travellerComponentMap = {
  PAIR_MP: PairMP,
  PAIR_IMP: PairIMPTable,
  PAIR_XIMP: PairXIMPTable,
  INDIVIDUAL_MP: IndividualMP,
  INDIVIDUAL_IMP: IndividualIMPTable,
  INDIVIDUAL_XIMP: IndividualXIMPTable,
} satisfies ComponentRegistry;

type Props = {
  scoredTraveller: ScoredTraveller;
};

export function Traveller({ scoredTraveller }: Props) {
  const Component = travellerComponentMap[scoredTraveller.type];

  return <Component scoredTraveller={scoredTraveller} />;
}
