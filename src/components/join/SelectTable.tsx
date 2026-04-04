type Assignment = {
  table: number;
  direction: "NS" | "EW";
};

interface Props {
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
  assigned: Assignment[];
}

export default function SelectTable({ tables, selectTable, assigned }: Props) {
  const isTaken = (table: number, direction: "NS" | "EW") => {
    return assigned.some((a) => a.table === table && a.direction === direction);
  };

  const isTableFull = (table: number) =>
    isTaken(table, "NS") && isTaken(table, "EW");

  const tableNumbers = Array.from({ length: tables }, (_, i) => i + 1);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="w-full flex-shrink-0">{/*<SectionInfo />*/}</div>

      <div className="px-4 mt-4 mb-2">
        <span>Please select the table and direction you are sitting:</span>
      </div>

      {/* Scrollable Grid */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {tableNumbers.map((table) => (
            <div
              key={table}
              className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${
                isTableFull(table) ? "opacity-50" : ""
              }`}
            >
              <div className="text-center py-3 text-lg font-semibold text-gray-700 border-b border-gray-200 bg-blue-300">
                Table {table}
              </div>
              <div className="grid grid-cols-2">
                <button
                  onClick={() => selectTable(table, "NS")}
                  disabled={isTaken(table, "NS")}
                  className={`py-5 text-lg font-medium transition border-r border-gray-200
    ${
      isTaken(table, "NS")
        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
    }`}
                >
                  NS
                </button>

                <button
                  onClick={() => selectTable(table, "EW")}
                  disabled={isTaken(table, "EW")}
                  className={`py-5 text-lg font-medium transition
    ${
      isTaken(table, "EW")
        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
    }`}
                >
                  EW
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
