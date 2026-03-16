import React from "react";
import { RankedPairResultRow } from "@/model/ranks";

interface PairLeaderboardProps {
  results: RankedPairResultRow[];
  showPercentage?: boolean; // default true for MPs
  showCrossImps?: boolean; // default true for IMPs
}

export const PairLeaderboard: React.FC<PairLeaderboardProps> = ({
  results,
  showPercentage = true,
  showCrossImps = true,
}) => {
  return (
    // NS No. 1
    // EW No. 3
    // Result. 2S+1X-3
    // NS Score. -300
    // NS IMPS. 1.23

    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-300 shadow-sm rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 border">Rank</th>
            <th className="px-4 py-2 border">Pair ID</th>
            <th className="px-4 py-2 border">NS Total</th>
            <th className="px-4 py-2 border">EW Total</th>
            {showPercentage && results[0]?.travellerType === "MP" && (
              <th className="px-4 py-2 border">Percentage</th>
            )}
            {showCrossImps && results[0]?.travellerType === "IMP" && (
              <th className="px-4 py-2 border">Cross IMPs</th>
            )}
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.pairId} className="even:bg-gray-50">
              <td className="px-4 py-2 border text-center">{row.rank}</td>
              <td className="px-4 py-2 border text-center">{row.pairId}</td>
              <td className="px-4 py-2 border text-right">{row.totalNs}</td>
              <td className="px-4 py-2 border text-right">{row.totalEw}</td>
              {showPercentage && row.travellerType === "MP" && (
                <td className="px-4 py-2 border text-right">
                  {row.percentage?.toFixed(2)}%
                </td>
              )}
              {showCrossImps && row.travellerType === "IMP" && (
                <td className="px-4 py-2 border text-right">
                  {row.crossImps?.toFixed(2)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
