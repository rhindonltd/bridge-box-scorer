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
import type { Card, Deal, Rank } from "./common";

// Build a genuinely valid 52-card deal programmatically so the test data is
// self-consistent (each of the 52 cards appears exactly once).
function buildValidDeal(): Deal {
  // Distribute the 52 cards: give each direction one full suit's worth split.
  // N: all spades; E: all hearts; S: all diamonds; W: all clubs.
  const ranks: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r): Card => `S${r}`),
    E: ranks.map((r): Card => `H${r}`),
    S: ranks.map((r): Card => `D${r}`),
    W: ranks.map((r): Card => `C${r}`),
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
    const hand: Card[] = ["SK", "S6", "S5", "H5", "H4", "H3", "CA", "CJ", "C9", "C8", "C7", "C5", "C4"];
    // ♠K65 ♥543 ♦void ♣AJ98754
    expect(handToPbnString(hand)).toBe("K65.543..AJ98754");
  });

  it("shows a void suit as an empty segment", () => {
    const hand = pbnStringToHand("K65.543..AJ98754");
    expect(handToPbnString(hand)).toBe("K65.543..AJ98754");
  });

  it("round-trips a hand string back to cards", () => {
    const hand = pbnStringToHand("K65.543..AJ98754");
    expect(hand).toContain("SK");
    expect(hand).toContain("H3");
    expect(hand).toContain("CA");
    expect(hand).not.toContain("DA");
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
      N: ["SA", "SK", "SQ", "SJ", "ST", "S9", "S8", "S7", "S6", "S5", "S4", "S3", "S2"],
      E: ["HA", "HK", "HQ", "HJ", "HT", "H9", "H8", "H7", "H6", "H5", "H4", "H3", "H2"],
      S: ["DA", "DK", "DQ", "DJ", "DT", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2"],
      W: ["CA", "CK", "CQ", "CJ", "CT", "C9", "C8", "C7", "C6", "C5", "C4", "C3", "C2"],
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
    deal.W[0] = "SA";
    expect(isCompleteDeal(deal)).toBe(false);
  });

  it("rejects a deal missing a card (with a duplicate elsewhere keeping counts)", () => {
    const deal = buildValidDeal();
    // Drop S2 from North, and duplicate S3 so counts stay at 13 but S2 missing.
    deal.N = deal.N.filter((c) => c !== "S2");
    deal.N.push("S3");
    expect(isCompleteDeal(deal)).toBe(false);
  });

  it("rejects an invalid card token", () => {
    const deal = buildValidDeal();
    deal.N[0] = "XZ" as Card;
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
