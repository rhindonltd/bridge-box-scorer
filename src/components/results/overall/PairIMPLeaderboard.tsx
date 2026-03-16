import React from "react";
import { PairIMPResult } from "@/model/overall-result";

interface Props {
  results: PairIMPResult[];
}

export type RankedResult<T> = T & {
  rank: number;
  tied: boolean;
};

export function rankByCrossImps<T extends { crossImps: number }>(
  rows: T[],
): RankedResult<T>[] {
  const ranked: RankedResult<T>[] = [];

  let i = 0;

  while (i < rows.length) {
    const start = i;
    const crossImps = rows[i].crossImps;

    // Find how many rows share this percentage
    while (
      i < rows.length &&
      Math.abs(rows[i].crossImps - crossImps) < 0.0001
    ) {
      i++;
    }

    const groupSize = i - start;
    const rank = start + 1;
    const tied = groupSize > 1;

    for (let j = start; j < i; j++) {
      ranked.push({
        ...rows[j],
        rank,
        tied,
      });
    }
  }

  return ranked;
}

export function PairIMPLeaderboard({ results }: Props) {
  const rankedResults = rankByCrossImps(results);

  return (
    <div className="p-2 overflow-x-auto max-w-3xl mx-auto">
      <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden text-sm shadow">
        <thead className="bg-blue-600 text-white uppercase text-xs tracking-wide sticky top-0">
          <tr>
            <th className="px-3 py-2 text-center">Rank</th>
            <th className="px-3 py-2 text-center">Pair</th>
            <th className="px-3 py-2 text-left">Players</th>
            <th className="px-3 py-2 text-right">X-Imps</th>
          </tr>
        </thead>

        <tbody>
          {rankedResults.map((row, index) => {
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
                <td className="px-3 py-2 text-center">
                  {row.tied ? `${row.rank}=` : row.rank}
                </td>

                <td className="px-3 py-2 text-center font-medium">
                  {row.pairId}
                </td>

                <td className="px-3 py-2">
                  {row.players
                    .map((p) => `${p.firstName} ${p.lastName}`)
                    .join(" & ")}
                </td>

                <td className="px-3 py-2 text-right font-semibold">
                  {row.crossImps.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
