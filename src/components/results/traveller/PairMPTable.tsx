import { ScoredPairMPTraveller } from "@/model/scored-traveller";

type Props = {
  scoredTraveller: ScoredPairMPTraveller;
};

export function PairMPTable({ scoredTraveller }: Props) {
  return (
    <div className="p-1 overflow-x-auto">
      <table className="min-w-full shadow-sm rounded-lg border border-gray-200 divide-y divide-gray-200 text-sm">
        <thead className="bg-blue-600 text-white uppercase text-xs tracking-wide">
          <tr>
            <th className="px-1 py-2 rounded-tl-lg text-center">NS</th>
            <th className="px-1 py-2 text-center">EW</th>
            <th className="px-1 py-2 text-center">Contract</th>
            <th className="px-1 py-2 text-center">NS Score</th>
            <th className="px-1 py-2 text-center">NS MP</th>
            <th className="px-1 py-2 rounded-tr-lg text-center">EW MP</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {scoredTraveller.lines
            .filter((x) => x.score !== null)
            .map((row, index, arr) => {
              const isLast = index === arr.length - 1;
              return (
                <tr
                  key={row.nsPairId}
                  className={`even:bg-gray-200 hover:bg-gray-300 ${isLast ? "rounded-bl-lg rounded-br-lg" : ""}`}
                >
                  <td className="px-1 py-2 text-center">{row.nsPairId}</td>
                  <td className="px-1 py-2 text-center">{row.ewPairId}</td>
                  <td className="px-1 py-2 text-center">{row.outcome}</td>
                  <td className="px-1 py-2 text-center">{row.score}</td>
                  <td className="px-1 py-2 text-center">{row.nsMatchPoints}</td>
                  <td className="px-1 py-2 text-center">{row.ewMatchPoints}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
