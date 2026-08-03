"use client";

import { OpeningLead } from "@/components/play/OpeningLead";
import { Card, Rank, Suit } from "@/model/common";

type Props = {
  onLeadComplete: (suit: Suit, rank: Rank) => void;
};

export function StepOpeningLead({ onLeadComplete }: Props) {
  function handleSave(lead: Card) {
    // Card format is "SR" (suit + rank, e.g. "SA" for Ace of Spades)
    const suit = lead[0] as Suit;
    const rank = lead[1] as Rank;
    onLeadComplete(suit, rank);
  }

  return <OpeningLead onSave={handleSave} />;
}
