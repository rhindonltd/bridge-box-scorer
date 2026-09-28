"use client";

import { useEffect, useMemo, useState } from "react";
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

/** The full 52-card pack, used to derive a fourth hand from the other three. */
const FULL_PACK: readonly Card[] = Suits.flatMap((suit) =>
  Ranks.map((rank) => `${suit}${rank}` as Card),
);

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
 * If exactly three hands are full (13 each) and the fourth is still empty, the
 * fourth is fully determined — the 13 cards not in the other three — so fill it
 * in. Otherwise the deal is returned unchanged. Only an empty fourth hand is
 * filled, so a player can still deselect cards to make corrections afterwards.
 */
function autoFillFourthHand(deal: Deal): Deal {
  const fullDirs = Directions.filter((dir) => deal[dir].length === 13);
  if (fullDirs.length !== 3) return deal;

  const remaining = Directions.find((dir) => deal[dir].length !== 13)!;
  if (deal[remaining].length > 0) return deal;

  const inFullHands = new Set<Card>(fullDirs.flatMap((dir) => deal[dir]));
  const leftovers = FULL_PACK.filter((card) => !inFullHands.has(card));
  return { ...deal, [remaining]: leftovers };
}

/**
 * Capture the four hands for one board.
 *
 * The player picks a direction and a suit (both are toggles), then taps that
 * suit's ranks to add them to the hand. Showing one suit at a time keeps the 13
 * rank buttons large enough to tap on a phone. A card already used in any hand
 * is disabled so the 52 cards stay distinct, and each hand is capped at 13.
 * Once three hands are full the fourth is fully determined, so it is filled in
 * automatically (and cleared again if an earlier hand is then edited). The
 * built-in "Save cards" button is enabled only once the deal is complete and
 * legal (all 52 cards, 13 per hand); a parent can instead own the submit
 * control via {@link hideSubmit} + {@link onDealChange}. Read-only mode shows
 * the entered deal without controls (used when another player got there first).
 */
export function DealEntry({
  boardNumber,
  onSubmit,
  readOnlyDeal = null,
  initialDeal = null,
  submitLabel = "Save cards",
  onDealChange,
  hideSubmit = false,
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
  /**
   * Notified whenever the entered deal changes: the complete {@link Deal} once
   * all 52 cards are placed (13 per hand), or `null` while it is incomplete.
   * Lets a parent own the submit control (see {@link hideSubmit}) — it can
   * enable/submit using the deal handed back here.
   */
  onDealChange?: (deal: Deal | null) => void;
  /**
   * Do not render the built-in submit button. Use when the parent provides its
   * own submit action (e.g. in a shared action bar) and drives it from
   * {@link onDealChange}.
   */
  hideSubmit?: boolean;
}) {
  const [deal, setDeal] = useState<Deal>(
    () => initialDeal ?? emptyDeal(),
  );
  const [active, setActive] = useState<Direction>(dealerFor(boardNumber));
  const [activeSuit, setActiveSuit] = useState<Suit>("S");

  const used = useMemo(() => assignedCards(deal), [deal]);
  const complete = useMemo(() => isCompleteDeal(deal), [deal]);

  // Hand the deal up whenever it changes: the complete deal when all 52 cards
  // are placed, or null while incomplete. Lets a parent own the submit control.
  useEffect(() => {
    onDealChange?.(complete ? deal : null);
  }, [complete, deal, onDealChange]);

  /** How many cards of each suit the active hand already holds. */
  const suitCounts = useMemo(() => {
    const counts: Record<Suit, number> = { S: 0, H: 0, D: 0, C: 0 };
    for (const card of deal[active]) counts[card[0] as Suit] += 1;
    return counts;
  }, [deal, active]);

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
      const next = { ...prev, [active]: [...hand, card] };
      return autoFillFourthHand(next);
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

      {/* Suit selector: a toggle like the direction row, one suit at a time so
          the 13 rank buttons below get enough width to tap on small screens. */}
      <div className="grid grid-cols-4 gap-1.5">
        {Suits.map((suit) => {
          const selected = suit === activeSuit;
          return (
            <button
              key={suit}
              type="button"
              onClick={() => setActiveSuit(suit)}
              data-testid={`entry-suit-${suit}`}
              aria-pressed={selected}
              className={[
                "flex items-center justify-center gap-1 rounded-lg border py-2 text-lg font-medium",
                selected ? "bg-blue-600" : "bg-white",
                selected
                  ? "text-white"
                  : RED_SUITS.has(suit)
                    ? "text-red-600"
                    : "text-black",
              ].join(" ")}
            >
              <span>{SuitMap[suit]}</span>
              <span className="text-xs">{suitCounts[suit]}</span>
            </button>
          );
        })}
      </div>

      {/* Rank buttons for the active suit, wrapped over three rows so each
          button is large enough to tap on a phone. */}
      <div className="grid grid-cols-5 gap-1.5">
        {Ranks.map((rank) => {
          const card = `${activeSuit}${rank}` as Card;
          const inActiveHand = deal[active].includes(card);
          const usedElsewhere = used.has(card) && !inActiveHand;
          return (
            <button
              key={rank}
              type="button"
              disabled={usedElsewhere}
              onClick={() => toggleCard(card)}
              data-testid={`card-${activeSuit}${rank}`}
              className={[
                "rounded-lg border py-3 text-lg font-medium",
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

      {!hideSubmit && (
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
      )}
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
