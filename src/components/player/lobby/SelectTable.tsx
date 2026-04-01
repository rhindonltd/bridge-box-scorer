import { SectionInfo } from "@/components/common/SectionInfo";

interface Props {
  eventName: string;
  sessionName?: string;
  sectionName?: string;
  tables: number;
  selectTable: (table: number, direction: "NS" | "EW") => void;
}

export default function SelectTable({
  eventName,
  sessionName,
  sectionName,
  tables,
  selectTable,
}: Props) {
  const tableNumbers = Array.from({ length: tables }, (_, i) => i + 1);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="w-full flex-shrink-0">
        <SectionInfo
          eventName={eventName}
          sessionName={sessionName}
          sectionName={sectionName}
        />
        <div className="px-4 mt-4 mb-2">
          <span>Please select the table and direction you are sitting:</span>
        </div>
      </div>

      {/* Scrollable Grid */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {tableNumbers.map((table) => (
            <div
              key={table}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="text-center py-3 text-lg font-semibold text-gray-700 border-b border-gray-200 bg-blue-300">
                Table {table}
              </div>
              <div className="grid grid-cols-2">
                <button
                  onClick={() => selectTable(table, "NS")}
                  className="py-5 text-lg font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition border-r border-gray-200"
                >
                  NS
                </button>
                <button
                  onClick={() => selectTable(table, "EW")}
                  className="py-5 text-lg font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition"
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
