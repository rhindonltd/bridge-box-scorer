import { ContractSuit, Doubling } from "@/model/contract";
import { ParsedContract } from "@/model/result";
import { Vulnerability } from "@/model/vulnerability";
import { Direction } from "@/model/common";

// --- Lookup tables ---
const baseTrickPoints: Record<ContractSuit, number> = {
  C: 20,
  D: 20,
  H: 30,
  S: 30,
  NT: 30,
};
const slamBonuses: Record<
  number,
  { vulnerable: number; nonVulnerable: number }
> = {
  6: { vulnerable: 750, nonVulnerable: 500 },
  7: { vulnerable: 1500, nonVulnerable: 1000 },
};
const insultBonuses: Record<Doubling, number> = { "": 0, X: 50, XX: 100 };

export type ScoreType =
  | { type: "played"; score: number }
  | { type: "average"; ns: number; ew: number }
  | { type: "adjusted"; ns: number; ew: number };

export function scoreContract(
  parsed: ParsedContract,
  vulnerability: Vulnerability,
): number {
  const { declarer, level, suit, doubling, result } = parsed;
  const vulnerable = isVulnerable(declarer, vulnerability);
  const ns = declarer === "N" || declarer === "S";
  const sign = ns ? 1 : -1;

  const basePoints = trickValue(suit, level) * doublingMultiplier(doubling);

  if (result === "=" || result.startsWith("+")) {
    const overtricks = result === "=" ? 0 : Number(result.slice(1));

    const score =
      basePoints +
      overtricksPoints(suit, doubling, vulnerable, overtricks) +
      gameBonus(basePoints, vulnerable) +
      slamBonus(level, vulnerable) +
      insultBonuses[doubling];

    return score * sign;
  } else {
    // Contract down
    const undertricks = Number(result.slice(1));
    const penalty = undertricksPoints(undertricks, doubling, vulnerable);
    return penalty * (ns ? -1 : 1);
  }
}

// --- Helpers ---
function overtricksPoints(
  suit: ContractSuit,
  doubling: Doubling,
  vulnerable: boolean,
  overtricks: number,
): number {
  if (doubling === "") return overtricks * baseTrickPoints[suit];
  if (doubling === "X") return overtricks * (vulnerable ? 200 : 100);
  if (doubling === "XX") return overtricks * (vulnerable ? 400 : 200);
  return 0;
}

function gameBonus(basePoints: number, vulnerable: boolean): number {
  return basePoints >= 100 ? (vulnerable ? 500 : 300) : 50;
}

function slamBonus(level: number, vulnerable: boolean): number {
  return slamBonuses[level]?.[vulnerable ? "vulnerable" : "nonVulnerable"] || 0;
}

function undertricksPoints(
  under: number,
  doubling: Doubling,
  vulnerable: boolean,
): number {
  if (doubling === "") return under * (vulnerable ? 100 : 50);

  const steps = [
    vulnerable ? 200 : 100, // first undertrick
    vulnerable ? 300 : 200, // second
    vulnerable ? 300 : 200, // third
  ];

  let penalty = 0;
  for (let i = 0; i < under; i++) {
    penalty += i < 3 ? steps[i] : 300; // subsequent
  }

  if (doubling === "XX") penalty *= 2;
  return penalty;
}

function isVulnerable(
  declarer: Direction,
  vulnerability: Vulnerability,
): boolean {
  return (
    vulnerability === "Both" ||
    (declarer === "N" || declarer === "S"
      ? vulnerability === "NS"
      : vulnerability === "EW")
  );
}

function trickValue(suit: ContractSuit, level: number): number {
  return baseTrickPoints[suit] * level + (suit === "NT" ? 10 : 0);
}

function doublingMultiplier(doubling: Doubling): number {
  return doubling === "" ? 1 : doubling === "X" ? 2 : 4;
}
