import { PairIMPTraveller } from "@/model/traveller";
import {
  OverallTeamResult,
  TeamMatchLineScore,
  TeamMatchScore,
} from "@/model/leaderboard";

// /**
//  * Convert scored PairIMPTravellers into TeamMatchLines
//  * teamMap maps team IDs to their pairs, e.g. { Team01: ["Pair01","Pair03"] }
//  */
// export function pairTravellersToTeamMatchLines(
//   pairTravellers: PairIMPTraveller[],
// ): TeamMatchLine[] {
//   const matchLines: TeamMatchLine[] = [];
//
//   // Group travellers by board
//   const boardMap = new Map<number, PairIMPTraveller[]>();
//   for (const pt of pairTravellers) {
//     if (!boardMap.has(pt.board)) boardMap.set(pt.board, []);
//     boardMap.get(pt.board)!.push(pt);
//   }
//
//   for (const [board, travellers] of boardMap.entries()) {
//     // Compare every pair of pairs on this board
//     const pairs = travellers.flatMap((t) => t.lines);
//
//     for (let i = 0; i < pairs.length; i++) {
//       for (let j = i + 1; j < pairs.length; j++) {
//         const pairA = pairs[i];
//         const pairB = pairs[j];
//
//         const nsImps = (pairA.nsImps ?? 0) - (pairB.nsImps ?? 0);
//         const ewImps = (pairA.ewImps ?? 0) - (pairB.ewImps ?? 0);
//
//         matchLines.push({
//           board,
//           nsTeamId: pairA.nsPairId,
//           ewTeamId: pairB.nsPairId, // treat other pair as opponent
//           nsImps,
//           ewImps,
//         });
//       }
//     }
//   }
//
//   return matchLines;
// }
//
// /**
//  * Aggregate TeamMatchLines into TeamMatchResults (per match)
//  */
// export function computeTeamMatchResults(
//   matchLines: TeamMatchLine[],
// ): TeamMatchResult[] {
//   const matchMap = new Map<string, TeamMatchLine[]>();
//
//   for (const line of matchLines) {
//     const [team1, team2] = [line.nsTeamId, line.ewTeamId].sort();
//     const key = `${team1}-${team2}`;
//     if (!matchMap.has(key)) matchMap.set(key, []);
//     matchMap.get(key)!.push(line);
//   }
//
//   const results: TeamMatchResult[] = [];
//
//   for (const [, boardResults] of matchMap.entries()) {
//     const nsTotal = boardResults.reduce((sum, b) => sum + b.nsImps, 0);
//     const ewTotal = boardResults.reduce((sum, b) => sum + b.ewImps, 0);
//
//     results.push({
//       nsTeamId: boardResults[0].nsTeamId,
//       ewTeamId: boardResults[0].ewTeamId,
//       nsTotal,
//       ewTotal,
//       boardResults,
//     });
//   }
//
//   return results;
// }
//
// /**
//  * Aggregate overall IMPs per team from all matches
//  */
// export function aggregateOverallTeamResults(
//   matchResults: TeamMatchResult[],
// ): OverallTeamResult {
//   const overall: OverallTeamResult = {};
//
//   for (const match of matchResults) {
//     overall[match.nsTeamId] = (overall[match.nsTeamId] ?? 0) + match.nsTotal;
//     overall[match.ewTeamId] = (overall[match.ewTeamId] ?? 0) + match.ewTotal;
//   }
//
//   return overall;
// }
