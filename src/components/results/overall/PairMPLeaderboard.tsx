import React from "react";
import { PairMPResult } from "@/model/overall-result";

interface PairLeaderboardProps {
  results: PairMPResult[];
}

export const PairMPLeaderboard: React.FC<PairLeaderboardProps> = ({
  results,
}) => {
  return (
    <div className="p-2 overflow-x-auto max-w-3xl mx-auto">
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm shadow">
        <thead className="bg-blue-600 text-white uppercase text-xs tracking-wide sticky top-0">
          <tr>
            <th className="px-3 py-2 text-center">Rank</th>
            <th className="px-3 py-2 text-center">Pair</th>
            <th className="px-3 py-2 text-left">Players</th>
            <th className="px-3 py-2 text-right">%</th>
          </tr>
        </thead>

        <tbody>
          {results.map((row, index) => {
            const rank = index + 1;

            const highlight =
              rank === 1
                ? "bg-yellow-100 font-semibold"
                : rank === 2
                  ? "bg-gray-100"
                  : rank === 3
                    ? "bg-orange-100"
                    : "even:bg-gray-50";

            return (
              <tr
                key={row.pairId}
                className={`${highlight} hover:bg-blue-50 transition-colors`}
              >
                <td className="px-3 py-2 text-center">{rank}</td>

                <td className="px-3 py-2 text-center font-medium">
                  {row.pairId}
                </td>

                <td className="px-3 py-2">
                  {row.players
                    .map((p) => `${p.firstName} ${p.lastName}`)
                    .join(" & ")}
                </td>

                <td className="px-3 py-2 text-right font-semibold">
                  {row.percentage.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
