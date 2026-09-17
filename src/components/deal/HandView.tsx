import { Card, Direction, Suit, Suits, SuitMap, parseCard } from "@/model/common";

/** Rank order (high to low) for laying a suit out left-to-right. */
const RANK_ORDER = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(["H", "D"]);

const DIRECTION_LABEL: Record<Direction, string> = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
};

/** Group a hand's cards by suit, ranks descending, for row-per-suit display. */
function ranksBySuit(hand: Card[]): Record<Suit, string[]> {
  const bySuit: Record<Suit, string[]> = { S: [], H: [], D: [], C: [] };
  for (const card of hand) {
    const { rank, suit } = parseCard(card);
    bySuit[suit].push(rank);
  }
  for (const suit of Suits) {
    bySuit[suit].sort(
      (a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b),
    );
  }
  return bySuit;
}

/**
 * One player's hand, shown as four suit rows (♠ ♥ ♦ ♣). A void suit renders a
 * dash. Hearts and diamonds are red; spades and clubs black. The heading names
 * the seat and marks the dealer.
 */
export function HandView({
  direction,
  hand,
  isDealer,
}: {
  direction: Direction;
  hand: Card[];
  isDealer: boolean;
}) {
  const bySuit = ranksBySuit(hand);

  return (
    <div
      className="text-sm leading-tight"
      data-testid={`hand-${direction}`}
    >
      <div className="font-semibold text-gray-700">
        {DIRECTION_LABEL[direction]}
        {isDealer && (
          <span
            className="ml-1 rounded bg-gray-200 px-1 text-xs font-medium text-gray-600"
            data-testid={`dealer-${direction}`}
          >
            Dealer
          </span>
        )}
      </div>
      {Suits.map((suit) => {
        const ranks = bySuit[suit];
        return (
          <div key={suit} className="flex items-baseline gap-1">
            <span className={RED_SUITS.has(suit) ? "text-red-600" : "text-black"}>
              {SuitMap[suit]}
            </span>
            <span className="font-mono tracking-wide">
              {ranks.length > 0 ? ranks.join(" ") : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
