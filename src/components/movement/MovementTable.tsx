import { MovementByTable } from "@/movement/movementData";

export function MovementTable({ table }: { table: MovementByTable }) {
  const hasProgress = table.rounds.length > 0 && table.rounds[0].played != null;

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
    <div className="border rounded-lg shadow-sm overflow-x-auto mb-2">
      <div className="bg-blue-600 text-white px-3 py-1.5 font-semibold text-center">
        Table {table.tableNumber}
      </div>
      <table className="w-full table-auto border-collapse text-center text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Round</th>
            <th className="border px-2 py-1">NS</th>
            <th className="border px-2 py-1">EW</th>
            <th className="border px-2 py-1">Boards</th>
            {hasProgress && <th className="border px-2 py-1">Played</th>}
          </tr>
        </thead>
        <tbody>
          {table.rounds.map((round) => (
            <tr key={round.roundNumber} className={getRowClass(round)}>
              <td className="border px-2 py-1">{round.roundNumber}</td>
              <td className="border px-2 py-1">{round.ns}</td>
              <td className="border px-2 py-1">{round.ew}</td>
              <td className="border px-2 py-1">
                {boardRange(round.boardStart, round.boardEnd)}
              </td>
              {hasProgress && (
                <td className="border px-2 py-1">
                  {round.played}/{round.total}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
