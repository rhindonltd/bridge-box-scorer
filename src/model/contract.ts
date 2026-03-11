import { Direction } from "@/model/common";

const CONTRACT_REGEX = /^[1-7](S|H|D|C|NT)(X|XX)?[NESW]$/;
const CALL_REGEX = /^[1-7](S|H|D|C|NT)$/;

export const Levels = [1, 2, 3, 4, 5, 6, 7] as const;
export const ContractSuits = ["S", "H", "D", "C", "NT"] as const;
export const SpecialBids = ["P", "X", "XX"] as const;
export const Doublings = ["", "X", "XX"] as const;

export type Doubling = (typeof Doublings)[number];
export type Level = (typeof Levels)[number];
export type ContractSuit = (typeof ContractSuits)[number];
export type SpecialBid = (typeof SpecialBids)[number];
export type CallCode = `${Level}${ContractSuit}`;
export type BidCode = CallCode | SpecialBid;
export type ContractCode = `${Level}${ContractSuit}${Doubling}${Direction}`;
export type StoredBid = { bid: BidCode; alerted?: boolean; alertText?: string };
export type Auction = { dealer: Direction; bids: StoredBid[] };

export function isContractCode(value: string): value is ContractCode {
  return CONTRACT_REGEX.test(value);
}

export function parseContract(code: ContractCode) {
  const level = Number(code[0]) as Level;

  const suitMatch = code.match(/S|H|D|C|NT/)!;
  const suit = suitMatch[0] as ContractSuit;

  const doublingMatch = code.match(/XX|X/);
  const doubling = (doublingMatch?.[0] ?? "") as Doubling;

  const declarer = code.slice(-1) as Direction;

  return { level, suit, doubling, declarer };
}

export function isCall(bid: BidCode): bid is CallCode {
  return CALL_REGEX.test(bid);
}
