import { Table } from "@/model/movement";
import { formatBoards } from "@/movement/shared";

type Props = {
  table: Table;
};

export default function MovementTable({ table }: Props) {
  return (
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
  );
}
