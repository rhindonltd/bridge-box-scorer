"use client";

import { OpeningLead } from "@/components/play/contract-wizard/OpeningLead";
import { Card, Rank, Suit } from "@/model/common";

type Props = {
  onLeadComplete: (suit: Suit, rank: Rank) => void;
  initialSuit?: Suit | null;
  initialRank?: Rank | null;
  onSuitChange?: (suit: Suit) => void;
  onRankChange?: (rank: Rank) => void;
};

export function StepOpeningLead({
  onLeadComplete,
  initialSuit,
  initialRank,
  onSuitChange,
  onRankChange,
}: Props) {
  function handleSave(lead: Card) {
    const suit = lead[0] as Suit;
    const rank = lead[1] as Rank;
    onLeadComplete(suit, rank);
  }

  return (
    <OpeningLead
      onSave={handleSave}
      initialSuit={initialSuit ?? undefined}
      initialRank={initialRank ?? undefined}
      onSuitChange={onSuitChange}
      onRankChange={onRankChange}
    />
  );
}
