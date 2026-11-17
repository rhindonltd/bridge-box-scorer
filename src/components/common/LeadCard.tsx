import { SuitMap, type Suit } from "@/model/common";

/** An opening-lead card (e.g. "SA" → "♠A"), with red/black suit colouring. */
export function LeadCard({ card }: { card: string }) {
  const suit = card[0] as Suit;
  const rank = card.slice(1);
  const red = suit === "H" || suit === "D";
  return (
    <span data-testid="lead-card">
      <span className={red ? "text-red-600" : "text-black"}>
        {SuitMap[suit]}
      </span>
      {rank === "T" ? "10" : rank}
    </span>
  );
}
