"use client";

import { useMemo, useState } from "react";
import {
  Card,
  Deal,
  Direction,
  Directions,
  Rank,
  Ranks,
  Suit,
  Suits,
  SuitMap,
} from "@/model/common";
import { dealerFor, isCompleteDeal } from "@/model/deal";

const DIRECTION_LABEL: Record<Direction, string> = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
};

const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(["H", "D"]);

/** An empty, four-hand deal in progress. */
function emptyDeal(): Deal {
  return { N: [], E: [], S: [], W: [] };
}

/** Every card that has been assigned to any hand, for duplicate prevention. */
function assignedCards(deal: Deal): Set<Card> {
  const set = new Set<Card>();
  for (const dir of Directions) {
    for (const card of deal[dir]) set.add(card);
  }
  return set;
}

/**
 * Capture the four hands for one board.
 *
 * The player picks a direction, then taps the cards in that hand. A card
 * already used in any hand is disabled so the 52 cards stay distinct, and each
 * hand is capped at 13. "Save cards" is enabled only once the deal is complete
 * and legal (all 52 cards, 13 per hand). Read-only mode shows the entered deal
 * without controls (used when another player got there first).
 */
export function DealEntry({
  boardNumber,
  onSubmit,
  readOnlyDeal = null,
  initialDeal = null,
  submitLabel = "Save cards",
}: {
  boardNumber: number;
  onSubmit: (deal: Deal) => void;
  /** When set, show this deal read-only (already entered by someone else). */
  readOnlyDeal?: Deal | null;
  /**
   * Pre-populate the entry grid with this deal (e.g. the director editing an
   * existing deal). Ignored when `readOnlyDeal` is set.
   */
  initialDeal?: Deal | null;
  /** Label for the submit button (e.g. "Save cards" / "Save deal"). */
  submitLabel?: string;
}) {
  const [deal, setDeal] = useState<Deal>(
    () => initialDeal ?? emptyDeal(),
  );
  const [active, setActive] = useState<Direction>(dealerFor(boardNumber));

  const used = useMemo(() => assignedCards(deal), [deal]);
  const complete = useMemo(() => isCompleteDeal(deal), [deal]);

  if (readOnlyDeal) {
    return (
      <div className="p-4" data-testid="deal-entry-readonly">
        <p className="mb-3 text-sm text-gray-600">
          These cards have already been entered for board {boardNumber}.
        </p>
        <div className="flex flex-col gap-3">
          {Directions.map((dir) => (
            <ReadOnlyHand key={dir} direction={dir} hand={readOnlyDeal[dir]} />
          ))}
        </div>
      </div>
    );
  }

  function toggleCard(card: Card) {
    setDeal((prev) => {
      const hand = prev[active];
      if (hand.includes(card)) {
        // Deselect from the active hand.
        return { ...prev, [active]: hand.filter((c) => c !== card) };
      }
      // Reject if used in another hand, or this hand is already full.
      if (used.has(card) || hand.length >= 13) return prev;
      return { ...prev, [active]: [...hand, card] };
    });
  }

  return (
    <div className="flex flex-1 flex-col p-4 gap-3" data-testid="deal-entry">
      {/* Direction selector: tabs with per-hand counts. */}
      <div className="grid grid-cols-4 gap-1.5">
        {Directions.map((dir) => {
          const count = deal[dir].length;
          const selected = dir === active;
          return (
            <button
              key={dir}
              type="button"
              onClick={() => setActive(dir)}
              data-testid={`entry-dir-${dir}`}
              className={[
                "rounded-lg border py-2 text-sm font-medium",
                selected ? "bg-blue-600 text-white" : "bg-white text-gray-700",
                count === 13 ? "ring-2 ring-emerald-400" : "",
              ].join(" ")}
            >
              {DIRECTION_LABEL[dir]}
              <span className="block text-xs">{count}/13</span>
            </button>
          );
        })}
      </div>

      {/* Card grid for the active hand, grouped by suit. */}
      <div className="flex flex-col gap-2">
        {Suits.map((suit) => (
          <div key={suit} className="flex items-center gap-1">
            <span
              className={[
                "w-5 text-lg",
                RED_SUITS.has(suit) ? "text-red-600" : "text-black",
              ].join(" ")}
            >
              {SuitMap[suit]}
            </span>
            <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 flex-1">
              {Ranks.map((rank) => {
                const card = `${suit}${rank}` as Card;
                const inActiveHand = deal[active].includes(card);
                const usedElsewhere = used.has(card) && !inActiveHand;
                return (
                  <button
                    key={rank}
                    type="button"
                    disabled={usedElsewhere}
                    onClick={() => toggleCard(card)}
                    data-testid={`card-${suit}${rank}`}
                    className={[
                      "rounded border py-1 text-xs font-medium",
                      inActiveHand
                        ? "bg-blue-600 text-white"
                        : usedElsewhere
                          ? "bg-gray-100 text-gray-300"
                          : "bg-white text-gray-800 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {rank}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 pt-2">
        <button
          type="button"
          disabled={!complete}
          onClick={() => onSubmit(deal)}
          data-testid="deal-entry-save"
          className="w-full rounded-xl bg-blue-600 py-3 text-lg font-bold text-white disabled:bg-gray-300"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/** Read-only display of one hand (used in the already-entered state). */
function ReadOnlyHand({
  direction,
  hand,
}: {
  direction: Direction;
  hand: Card[];
}) {
  const bySuit: Record<Suit, Rank[]> = { S: [], H: [], D: [], C: [] };
  for (const card of hand) {
    bySuit[card[0] as Suit].push(card[1] as Rank);
  }
  const order = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  for (const suit of Suits) {
    bySuit[suit].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  return (
    <div className="text-sm">
      <div className="font-semibold text-gray-700">
        {DIRECTION_LABEL[direction]}
      </div>
      {Suits.map((suit) => (
        <div key={suit} className="flex items-baseline gap-1">
          <span className={RED_SUITS.has(suit) ? "text-red-600" : "text-black"}>
            {SuitMap[suit]}
          </span>
          <span className="font-mono">
            {bySuit[suit].length ? bySuit[suit].join(" ") : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
