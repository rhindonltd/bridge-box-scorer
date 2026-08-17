import { MovementByRound } from "@/movement/movementData";

export function MovementRound({ round }: { round: MovementByRound }) {
  const hasProgress = round.tables.length > 0 && round.tables[0].played != null;

  function boardRange(start: number, end: number): string {
    return start === end ? `${start}` : `${start}-${end}`;
  }

  function getRowClass(round: {
    played?: number;
    total?: number;
    hasPreviousGap?: boolean;
  }): string {
    if (round.played == null || round.total == null) return "even:bg-gray-50";
    if (round.hasPreviousGap) return "bg-red-100";
    if (round.played === round.total && round.total > 0) return "bg-green-100";
    if (round.played > 0) return "bg-yellow-100";
    return "";
  }

  return (
    <div className="border rounded-lg shadow-sm overflow-x-auto">
      <div className="bg-blue-600 text-white px-3 py-1.5 font-semibold text-center">
        Round {round.roundNumber}
      </div>
      <table className="w-full table-auto border-collapse text-center text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Table</th>
            <th className="border px-2 py-1">NS</th>
            <th className="border px-2 py-1">EW</th>
            <th className="border px-2 py-1">Boards</th>
            {hasProgress && <th className="border px-2 py-1">Played</th>}
          </tr>
        </thead>
        <tbody>
          {round.tables.map((table) => (
            <tr key={table.tableNumber} className={getRowClass(table)}>
              <td className="border px-2 py-1">{table.tableNumber}</td>
              <td className="border px-2 py-1">{table.ns}</td>
              <td className="border px-2 py-1">{table.ew}</td>
              <td className="border px-2 py-1">
                {boardRange(table.boardStart, table.boardEnd)}
              </td>
              {hasProgress && (
                <td className="border px-2 py-1">
                  {table.played}/{table.total}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
