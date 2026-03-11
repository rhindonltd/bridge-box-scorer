import {
  PairIMPTraveller,
  PairMPTraveller,
  PairTravellerLine,
  ImpScore,
  MatchpointScore,
} from "@/model/traveller";
import { compareWithField } from "@/model/score-traveller";

export interface RankedPairResultRow {
  pairId: string;
  totalNs: number; // total IMPs or MPs
  totalEw: number; // total IMPs or MPs
  crossImps?: number; // only for IMP travellers
  percentage?: number; // only for MPs
  rank: number;
  travellerType: "MP" | "IMP";
}

/** Type guard: checks if a line is IMP */
function isImpLine(
  line: PairTravellerLine<ImpScore> | PairTravellerLine<MatchpointScore>,
): line is PairTravellerLine<ImpScore> {
  return "nsImps" in line && "ewImps" in line;
}

/** Type guard: checks if traveller is IMP */
function isImpTraveller(
  traveller: PairIMPTraveller | PairMPTraveller,
): traveller is PairIMPTraveller {
  return traveller.lines.length > 0 && isImpLine(traveller.lines[0]);
}

/**
 * Aggregate pair travellers into a ranked results table
 * Computes cross-IMPs for IMP travellers and percentage for MPs
 */
export function aggregatePairTravellersWithCrossImps<
  T extends PairIMPTraveller | PairMPTraveller,
>(
  travellers: T[],
  maxPointsPerBoard?: number, // for MP percentage
  totalBoards?: number, // for MP percentage
): RankedPairResultRow[] {
  const totals = new Map<
    string,
    { ns: number; ew: number; crossImps?: number }
  >();

  if (travellers.length === 0) return [];

  const travellerType: "MP" | "IMP" = isImpTraveller(travellers[0])
    ? "IMP"
    : "MP";

  for (const traveller of travellers) {
    // For IMP travellers, compute valid scores per board for cross-IMPs
    let validScores: number[] = [];
    if (travellerType === "IMP") {
      validScores = traveller.lines.filter(isImpLine).map((l) => l.nsImps ?? 0);
    }

    for (const line of traveller.lines) {
      // NS pair
      let nsTotal = totals.get(line.nsPairId);
      if (!nsTotal) {
        nsTotal = { ns: 0, ew: 0, crossImps: 0 };
        totals.set(line.nsPairId, nsTotal);
      }

      // EW pair
      let ewTotal = totals.get(line.ewPairId);
      if (!ewTotal) {
        ewTotal = { ns: 0, ew: 0, crossImps: 0 };
        totals.set(line.ewPairId, ewTotal);
      }

      if (travellerType === "IMP" && isImpLine(line)) {
        // Add NS/EW IMPs
        nsTotal.ns += line.nsImps ?? 0;
        nsTotal.ew += line.ewImps ?? 0;
        ewTotal.ns += line.ewImps ?? 0;
        ewTotal.ew += line.nsImps ?? 0;

        // Compute cross-IMPs
        const impTotal = compareWithField(line.nsImps ?? 0, validScores);
        nsTotal.crossImps! += impTotal;
        ewTotal.crossImps! -= impTotal; // EW opposite
      } else if (!isImpLine(line)) {
        // Matchpoint line
        nsTotal.ns += line.nsMatchPoints ?? 0;
        nsTotal.ew += line.ewMatchPoints ?? 0;
        ewTotal.ns += line.ewMatchPoints ?? 0;
        ewTotal.ew += line.nsMatchPoints ?? 0;
      }
    }
  }

  // Convert totals map to array
  const result: RankedPairResultRow[] = Array.from(totals.entries()).map(
    ([pairId, totals]) => ({
      pairId,
      totalNs: totals.ns,
      totalEw: totals.ew,
      crossImps: travellerType === "IMP" ? totals.crossImps : undefined,
      percentage:
        travellerType === "MP" && maxPointsPerBoard && totalBoards
          ? (totals.ns / (maxPointsPerBoard * totalBoards)) * 100
          : undefined,
      rank: 0,
      travellerType,
    }),
  );

  // Sort rows: for IMP use crossImps, for MP use totalNs then totalEw
  result.sort((a, b) => {
    if (travellerType === "IMP") {
      return (b.crossImps ?? 0) - (a.crossImps ?? 0);
    } else {
      if (b.totalNs !== a.totalNs) return b.totalNs - a.totalNs;
      return (b.totalEw ?? 0) - (a.totalEw ?? 0);
    }
  });

  // Assign ranks with tie handling
  let currentRank = 1;
  for (let i = 0; i < result.length; i++) {
    if (i > 0) {
      const prev = result[i - 1];
      if (
        travellerType === "IMP"
          ? result[i].crossImps === prev.crossImps
          : result[i].totalNs === prev.totalNs &&
            result[i].totalEw === prev.totalEw
      ) {
        result[i].rank = prev.rank; // tie
      } else {
        result[i].rank = currentRank;
      }
    } else {
      result[i].rank = currentRank;
    }
    currentRank++;
  }

  return result;
}
