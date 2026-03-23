import Button from "@/components/common/Button";

interface Props {
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
}

export default function SelectTable({ tables, selectTable }: Props) {
  const tableNumbers = Array.from({ length: tables }, (_, i) => i + 1);

  return (
    <div className="flex flex-col w-screen min-h-screen bg-gray-100 font-sans p-4 gap-4">
      {tableNumbers.map((table) => (
        <div
          key={table}
          className="w-full bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-blue-600 text-white text-center py-3 text-lg font-bold">
            Table {table}
          </div>

          {/* NS / EW split row */}
          <div className="flex">
            {/* NS */}
            <Button
              value="NS"
              bgColour="bg-indigo-500"
              hoverColour="hover:bg-indigo-600"
              onClick={() => selectTable(table, "NS")}
            />
            <Button
              value="EW"
              bgColour="bg-green-600"
              hoverColour="hover:bg-green-700"
              onClick={() => selectTable(table, "EW")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
