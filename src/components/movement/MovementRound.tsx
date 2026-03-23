import { Round } from "@/model/movement";
import { formatBoards } from "@/movement/shared";

type Props = {
  round: Round;
};

export default function MovementRound({ round }: Props) {
  return (
    <div
      key={round.round}
      className="w-full border rounded-lg shadow-md overflow-hidden"
    >
      {/* Table Heading */}
      <div className="bg-blue-600 text-white px-2 py-2 font-semibold text-lg flex justify-center items-center">
        Round {round.round}
      </div>

      {/* Table Content */}
      <table className="w-full table-auto border-collapse text-center">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-2">Table</th>
            <th className="border px-2 py-2">NS</th>
            <th className="border px-2 py-2">EW</th>
            <th className="border px-2 py-2">Boards</th>
          </tr>
        </thead>
        <tbody>
          {round.tables.map((table, idx) => (
            <tr key={idx} className="even:bg-gray-50">
              <td className="border px-2 py-2">{table.table}</td>
              <td className="border px-2 py-2">{table.pair.ns}</td>
              <td className="border px-2 py-2">{table.pair.ew}</td>
              <td className="border px-2 py-2">
                {formatBoards(table.pair.boards)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
