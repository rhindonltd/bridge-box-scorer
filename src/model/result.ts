import { ContractCode, ContractSuit, Level } from "@/model/contract";
import { Direction } from "@/model/common";

const PLAYED_CONTRACT_REGEX =
  /^[1-7](S|H|D|C|NT)(X|XX)?[NESW](=|\+[1-6]|-[1-7])$/;

export type OverTricks = `+${1 | 2 | 3 | 4 | 5 | 6}`;
export type UnderTricks = `-${1 | 2 | 3 | 4 | 5 | 6 | 7}`;
export type ContractResult = "=" | OverTricks | UnderTricks;
export type PlayedContractCode = `${ContractCode}${ContractResult}`;

export type ParsedContract = {
  level: Level;
  suit: ContractSuit;
  doubling: "" | "X" | "XX";
  declarer: Direction;
  result: "=" | `+${number}` | `-${number}`;
};

export function isPlayedContractCode(
  value: string,
): value is PlayedContractCode {
  return PLAYED_CONTRACT_REGEX.test(value);
}

export function parsePlayedContract(code: PlayedContractCode): ParsedContract {
  const match = code.match(
    /^([1-7])(S|H|D|C|NT)(XX|X)?([NESW])(=|\+[1-6]|-[1-7])$/,
  );

  if (!match) {
    throw new Error(`Invalid contract: ${code}`);
  }

  const [, lvl, suit, dbl, decl, result] = match;

  return {
    level: Number(lvl) as Level,
    suit: suit as ContractSuit,
    doubling: (dbl ?? "") as "" | "X" | "XX",
    declarer: decl as Direction,
    result: result as ParsedContract["result"],
  };
}
