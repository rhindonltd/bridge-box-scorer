// Regex
const CARD_REGEX = /^[AKQJT98765432][SHDC]$/;

// Consts
export const Directions = ["N", "E", "S", "W"] as const;
export const PairDirections = ["NS", "EW"] as const;
export const Ranks = [
  "A",
  "K",
  "Q",
  "J",
  "T",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
] as const;
export const Suits = ["S", "H", "D", "C"] as const;
export const SuitMap: Record<Suit, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
} as const;

// Types
export type Direction = (typeof Directions)[number];
export type PairDirection = (typeof PairDirections)[number];
export type Rank = (typeof Ranks)[number];
export type Suit = (typeof Suits)[number];
export type Card = `${Suit}${Rank}`;

// Helper functions
export function parseCard(code: string): { rank: Rank; suit: Suit } {
  if (!isCard(code)) {
    throw new Error(`Invalid card: ${code}`);
  }

  return {
    suit: code[1] as Suit,
    rank: code[0] as Rank,
  };
}

export function isCard(value: string): value is Card {
  return CARD_REGEX.test(value);
}

export interface Board {
  boardNumber: number;
  deal: Deal;
}

/**
 * A full deal is the four hands, one per compass direction. Each hand is a list
 * of {@link Card} codes (rank-first, e.g. "AS", "TH"). See `@/model/deal` for
 * the PBN codec and completeness validation.
 */
export type Deal = Record<Direction, Card[]>;
