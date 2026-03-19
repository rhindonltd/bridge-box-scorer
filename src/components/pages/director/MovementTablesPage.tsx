"use client";

import { generateMovement } from "@/movement/mitchell";
import { MovementTables } from "@/model/movement";

type Props = {
  name: string;
  tables: number;
  rounds: number;
  boardsPerRound: number;
  missingPair: string | null;
  arrowSwitchRounds: number;
};

export default function MovementTablesPage({
                                              name,
                                              tables,
                                              rounds,
                                              boardsPerRound,
                                              missingPair,
                                              arrowSwitchRounds,
                                            }: Props) {
  const movement: MovementTables = generateMovement({
    tables,
    rounds,
    boardsPerRound,
    arrowSwitchRounds,
  });

  const formatBoards = (boards: number[]): string => {
    if (boards.length === 0) return "";
    const ranges: string[] = [];
    let start = boards[0];
    let end = boards[0];

    for (let i = 1; i <= boards.length; i++) {
      if (boards[i] === end + 1) {
        end = boards[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = boards[i];
        end = boards[i];
      }
    }

    return ranges.join(",");
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">{name}</h1>

      {movement.tables.map((table) => (
        <div
          key={table.table}
          className="w-full border rounded-lg shadow-md overflow-hidden"
        >
          {/* Table Heading */}
          <div className="bg-blue-600 text-white px-2 py-2 font-semibold text-lg flex justify-center items-center">
            Table {table.table}
          </div>

          {/* Table Content */}
          <table className="w-full table-auto border-collapse text-center">
            <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-2">Round</th>
              <th className="border px-2 py-2">NS</th>
              <th className="border px-2 py-2">EW</th>
              <th className="border px-2 py-2">Boards</th>
            </tr>
            </thead>
            <tbody>
            {table.rounds.map((round, idx) => (
              <tr key={idx} className="even:bg-gray-50">
                <td className="border px-2 py-2">{idx + 1}</td>
                <td className="border px-2 py-2">{round.ns}</td>
                <td className="border px-2 py-2">{round.ew}</td>
                <td className="border px-2 py-2">{formatBoards(round.boards)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
