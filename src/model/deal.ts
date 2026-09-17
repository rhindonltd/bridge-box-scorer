import {
  Card,
  Deal,
  Direction,
  Directions,
  Rank,
  Ranks,
  Suit,
  Suits,
  isCard,
  parseCard,
} from "./common";

/**
 * Pure deal / PBN utilities.
 *
 * A {@link Deal} is the four hands keyed by compass direction, each hand a list
 * of rank-first {@link Card} codes (e.g. "AS", "TH"). This module owns the
 * boundary between that in-memory shape and the PBN storage/interchange string,
 * plus strict completeness validation. It performs no I/O so it stays
 * unit-testable and reusable (UI, DB actions, USEBIO export all share it).
 *
 * PBN deal format: `"<Dealer>:h1 h2 h3 h4"` where the four hands are listed
 * clockwise starting from the dealer, and each hand is
 * `spades.hearts.diamonds.clubs` with ranks in descending order and a void suit
 * shown as an empty segment. Example (♠K65 ♥543 ♦void ♣AJ98754): `K65.543..AJ98754`.
 */

/** Clockwise seat order used to walk hands from the dealer. */
const CLOCKWISE: readonly Direction[] = ["N", "E", "S", "W"] as const;

/** PBN lists suits in this fixed order within each hand. */
const PBN_SUIT_ORDER: readonly Suit[] = ["S", "H", "D", "C"] as const;

/** Rank ordering index (A high .. 2 low) for descending sorts / validation. */
const RANK_INDEX: Record<Rank, number> = Object.fromEntries(
  Ranks.map((r, i) => [r, i]),
) as Record<Rank, number>;

/** Board vulnerability. */
export type Vulnerability = "Love" | "NS" | "EW" | "All";

/**
 * The standard duplicate vulnerability cycle over a repeating block of 16
 * boards (board 1 = Love, 2 = NS, ... 16 = All), indexed by (board-1) mod 16.
 * Matches the well-known board-set convention used by dealing machines.
 */
const VULNERABILITY_CYCLE: readonly Vulnerability[] = [
  "Love", "NS", "EW", "All", // 1..4
  "NS", "EW", "All", "Love", // 5..8
  "EW", "All", "Love", "NS", // 9..12
  "All", "Love", "NS", "EW", // 13..16
] as const;

/**
 * The dealer for a board number, by the standard duplicate convention:
 * board 1 = North, 2 = East, 3 = South, 4 = West, then cycling.
 */
export function dealerFor(boardNumber: number): Direction {
  // Board numbers are 1-based; map 1..4 -> N,E,S,W then wrap.
  const idx = ((boardNumber - 1) % 4 + 4) % 4;
  return CLOCKWISE[idx];
}

/** Clockwise seat order starting at `dealer` (e.g. E -> [E,S,W,N]). */
export function clockwiseFrom(dealer: Direction): Direction[] {
  const start = CLOCKWISE.indexOf(dealer);
  return CLOCKWISE.map((_, i) => CLOCKWISE[(start + i) % 4]);
}

/**
 * The vulnerability for a board number, by the standard duplicate convention
 * (a repeating 16-board cycle: board 1 = Love, 2 = NS, ... 16 = All).
 */
export function vulnerabilityFor(boardNumber: number): Vulnerability {
  const idx = ((boardNumber - 1) % 16 + 16) % 16;
  return VULNERABILITY_CYCLE[idx];
}

/**
 * Serialize one hand to its PBN segment (`spades.hearts.diamonds.clubs`), ranks
 * descending, void suit = empty. Cards are grouped by suit; ordering of the
 * input list does not matter.
 */
export function handToPbnString(hand: Card[]): string {
  const bySuit: Record<Suit, Rank[]> = { S: [], H: [], D: [], C: [] };

  for (const card of hand) {
    const { rank, suit } = parseCard(card);
    bySuit[suit].push(rank);
  }

  return PBN_SUIT_ORDER.map((suit) =>
    bySuit[suit]
      .sort((a, b) => RANK_INDEX[a] - RANK_INDEX[b])
      .join(""),
  ).join(".");
}

/**
 * Parse one PBN hand segment (`spades.hearts.diamonds.clubs`) into rank-first
 * card codes. Throws on a malformed segment (wrong suit count or bad rank).
 */
export function pbnStringToHand(segment: string): Card[] {
  const suitGroups = segment.split(".");
  if (suitGroups.length !== 4) {
    throw new Error(`Invalid PBN hand (expected 4 suits): "${segment}"`);
  }

  const cards: Card[] = [];
  suitGroups.forEach((group, i) => {
    const suit = PBN_SUIT_ORDER[i];
    for (const rankChar of group) {
      const card = `${rankChar}${suit}`;
      if (!isCard(card)) {
        throw new Error(`Invalid card in PBN hand: "${rankChar}${suit}"`);
      }
      cards.push(card as Card);
    }
  });

  return cards;
}

/**
 * Serialize a full {@link Deal} to a PBN string for the given dealer. Hands are
 * emitted clockwise from the dealer. The deal is not validated here; callers
 * that persist should gate on {@link isCompleteDeal} first.
 */
export function toPbn(deal: Deal, dealer: Direction): string {
  const order = clockwiseFrom(dealer);
  const hands = order.map((dir) => handToPbnString(deal[dir]));
  return `${dealer}:${hands.join(" ")}`;
}

/**
 * Parse a PBN deal string into a {@link Deal} keyed by absolute direction.
 * Throws if the string is malformed or the resulting deal is not a complete,
 * legal 52-card deal (all four hands present, 13 cards each, every card once).
 */
export function parsePbn(pbn: string): Deal {
  const colon = pbn.indexOf(":");
  if (colon <= 0) {
    throw new Error(`Invalid PBN deal (missing dealer): "${pbn}"`);
  }

  const dealer = pbn.slice(0, colon) as Direction;
  if (!Directions.includes(dealer)) {
    throw new Error(`Invalid PBN dealer: "${dealer}"`);
  }

  const segments = pbn.slice(colon + 1).trim().split(/\s+/);
  if (segments.length !== 4) {
    throw new Error(`Invalid PBN deal (expected 4 hands): "${pbn}"`);
  }

  const order = clockwiseFrom(dealer);
  const deal = {} as Deal;
  order.forEach((dir, i) => {
    deal[dir] = pbnStringToHand(segments[i]);
  });

  if (!isCompleteDeal(deal)) {
    throw new Error(`Invalid PBN deal (not a complete 52-card deal): "${pbn}"`);
  }

  return deal;
}

/**
 * Strict completeness check: all four directions present, each hand exactly 13
 * valid cards, and the 52 cards across all hands are distinct and cover the
 * full pack exactly once.
 */
export function isCompleteDeal(deal: Deal): boolean {
  const seen = new Set<string>();

  for (const dir of Directions) {
    const hand = deal[dir];
    if (!Array.isArray(hand) || hand.length !== 13) {
      return false;
    }
    for (const card of hand) {
      if (!isCard(card)) {
        return false;
      }
      if (seen.has(card)) {
        return false;
      }
      seen.add(card);
    }
  }

  // 4 hands * 13 distinct = 52; combined with the full-pack check below this
  // guarantees every card appears exactly once.
  if (seen.size !== 52) {
    return false;
  }

  for (const suit of Suits) {
    for (const rank of Ranks) {
      if (!seen.has(`${rank}${suit}`)) {
        return false;
      }
    }
  }

  return true;
}
