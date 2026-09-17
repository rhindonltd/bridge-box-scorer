import { describe, it, expect } from "vitest";
import {
  dealerFor,
  vulnerabilityFor,
  parsePbn,
  toPbn,
  isCompleteDeal,
  handToPbnString,
  pbnStringToHand,
} from "./deal";
import type { Deal } from "./common";

// Build a genuinely valid 52-card deal programmatically so the test data is
// self-consistent (each of the 52 cards appears exactly once).
function buildValidDeal(): Deal {
  // Distribute the 52 cards: give each direction one full suit's worth split.
  // N: all spades; E: all hearts; S: all diamonds; W: all clubs.
  const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r) => `${r}S`),
    E: ranks.map((r) => `${r}H`),
    S: ranks.map((r) => `${r}D`),
    W: ranks.map((r) => `${r}C`),
  };
}

describe("dealerFor", () => {
  it("cycles N,E,S,W by board number", () => {
    expect(dealerFor(1)).toBe("N");
    expect(dealerFor(2)).toBe("E");
    expect(dealerFor(3)).toBe("S");
    expect(dealerFor(4)).toBe("W");
  });

  it("wraps around after 4", () => {
    expect(dealerFor(5)).toBe("N");
    expect(dealerFor(6)).toBe("E");
    expect(dealerFor(16)).toBe("W");
    expect(dealerFor(17)).toBe("N");
  });
});

describe("vulnerabilityFor", () => {
  it("follows the standard 16-board cycle", () => {
    expect(vulnerabilityFor(1)).toBe("Love");
    expect(vulnerabilityFor(2)).toBe("NS");
    expect(vulnerabilityFor(3)).toBe("EW");
    expect(vulnerabilityFor(4)).toBe("All");
    expect(vulnerabilityFor(5)).toBe("NS");
    expect(vulnerabilityFor(16)).toBe("EW");
  });

  it("wraps around after 16 boards", () => {
    expect(vulnerabilityFor(17)).toBe("Love");
    expect(vulnerabilityFor(18)).toBe("NS");
  });
});

describe("handToPbnString / pbnStringToHand", () => {
  it("serializes a hand as spades.hearts.diamonds.clubs with ranks descending", () => {
    const hand = ["KS", "6S", "5S", "5H", "4H", "3H", "AC", "JC", "9C", "8C", "7C", "5C", "4C"];
    // ♠K65 ♥543 ♦void ♣AJ98754
    expect(handToPbnString(hand)).toBe("K65.543..AJ98754");
  });

  it("shows a void suit as an empty segment", () => {
    const hand = pbnStringToHand("K65.543..AJ98754");
    expect(handToPbnString(hand)).toBe("K65.543..AJ98754");
  });

  it("round-trips a hand string back to cards", () => {
    const hand = pbnStringToHand("K65.543..AJ98754");
    expect(hand).toContain("KS");
    expect(hand).toContain("3H");
    expect(hand).toContain("AC");
    expect(hand).not.toContain("AD");
    expect(hand).toHaveLength(13);
  });
});

describe("parsePbn / toPbn round-trip", () => {
  it("parses a full deal string into four hands keyed by direction", () => {
    const deal = buildValidDeal();
    const pbn = toPbn(deal, dealerFor(1));
    const parsed = parsePbn(pbn);
    expect(parsed).toEqual(deal);
  });

  it("orders hands clockwise from the dealer", () => {
    const deal = buildValidDeal();
    // Board 2 => dealer E, so string order is E S W N.
    const pbn = toPbn(deal, dealerFor(2));
    expect(pbn.startsWith("E:")).toBe(true);
    // First hand after "E:" is East's hand (all hearts) => only the hearts
    // segment is populated: spades.hearts.diamonds.clubs.
    const firstHand = pbn.slice(2).split(" ")[0];
    expect(firstHand).toBe(".AKQJT98765432..");
    expect(parsePbn(pbn)).toEqual(deal);
  });

  it("round-trips a deal containing voids", () => {
    // A hand-crafted valid deal where some suits are void in some hands.
    const deal: Deal = {
      N: ["AS", "KS", "QS", "JS", "TS", "9S", "8S", "7S", "6S", "5S", "4S", "3S", "2S"],
      E: ["AH", "KH", "QH", "JH", "TH", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"],
      S: ["AD", "KD", "QD", "JD", "TD", "9D", "8D", "7D", "6D", "5D", "4D", "3D", "2D"],
      W: ["AC", "KC", "QC", "JC", "TC", "9C", "8C", "7C", "6C", "5C", "4C", "3C", "2C"],
    };
    const pbn = toPbn(deal, dealerFor(1));
    expect(parsePbn(pbn)).toEqual(deal);
  });
});

describe("isCompleteDeal", () => {
  it("accepts a valid 52-card deal", () => {
    expect(isCompleteDeal(buildValidDeal())).toBe(true);
  });

  it("rejects a hand with the wrong number of cards", () => {
    const deal = buildValidDeal();
    deal.N = deal.N.slice(0, 12); // 12 cards
    expect(isCompleteDeal(deal)).toBe(false);
  });

  it("rejects a duplicate card across hands", () => {
    const deal = buildValidDeal();
    // Replace a West card with a card that already exists in North.
    deal.W[0] = "AS";
    expect(isCompleteDeal(deal)).toBe(false);
  });

  it("rejects a deal missing a card (with a duplicate elsewhere keeping counts)", () => {
    const deal = buildValidDeal();
    // Drop 2S from North, and duplicate 3S so counts stay at 13 but 2S missing.
    deal.N = deal.N.filter((c) => c !== "2S");
    deal.N.push("3S");
    expect(isCompleteDeal(deal)).toBe(false);
  });

  it("rejects an invalid card token", () => {
    const deal = buildValidDeal();
    deal.N[0] = "XZ";
    expect(isCompleteDeal(deal)).toBe(false);
  });
});

describe("parsePbn validation", () => {
  it("throws on a malformed PBN string", () => {
    expect(() => parsePbn("garbage")).toThrow();
  });

  it("throws when the deal is not complete (52 distinct cards)", () => {
    // Four empty hands.
    expect(() => parsePbn("N:... ... ... ...")).toThrow();
  });
});
