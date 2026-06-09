import { getVulnerability } from "@/model/vulnerability";
import { parsePlayedContract } from "@/model/result";
import { ImpTable } from "./imp-table";
import { BoardOutcome } from "@/model/score";
import { scoreContract } from "./score";

/* =========================
   CORE SCORING HELPERS
========================= */

export function outcomeToScore(
  board: number,
  outcome: BoardOutcome,
): number | null {
  if (outcome === "PO") return 0;
  if (outcome === "NP") return null;

  return scoreContract(parsePlayedContract(outcome), getVulnerability(board));
}

export function prepare<T extends { outcome: BoardOutcome }>(
  board: number,
  lines: T[],
) {
  return lines.map((line) => ({
    line,
    score: outcomeToScore(board, line.outcome),
  }));
}

export function computeImps(score: number) {
  return ImpTable.calculateImps(score);
}

export function computeCrossImps(score: number, valid: number[]) {
  return valid.reduce((acc, s) => acc + ImpTable.calculateImps(score - s), 0);
}
