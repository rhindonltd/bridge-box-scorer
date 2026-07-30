import { ContractSuit, Doubling, Level } from "@/model/contract";
import { Direction } from "@/model/common";
import { PlayedContractCode, ContractResult } from "@/model/result";

/**
 * Builds a PlayedContractCode from its constituent parts.
 *
 * @param level - Contract level (1-7)
 * @param suit - Contract suit (S, H, D, C, NT)
 * @param doubling - Doubling state ("", "X", "XX")
 * @param declarer - Declarer direction (N, E, S, W)
 * @param trickResult - Tricks relative to contract: 0 = exact, positive = overtricks, negative = down
 * @returns A PlayedContractCode like "3NTN=", "2SXE-2", "4HW+1"
 */
export function buildPlayedContractCode(
  level: Level,
  suit: ContractSuit,
  doubling: Doubling,
  declarer: Direction,
  trickResult: number,
): PlayedContractCode {
  const resultPart: ContractResult =
    trickResult === 0
      ? "="
      : trickResult > 0
        ? (`+${trickResult}` as ContractResult)
        : (`${trickResult}` as ContractResult);

  return `${level}${suit}${doubling}${declarer}${resultPart}` as PlayedContractCode;
}
