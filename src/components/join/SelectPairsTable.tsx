import { PairStartingPosition } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { PairDirection } from "@/model/common";
import { PairDirections } from "@/model/common";
import { Seat } from "@/model/participants";

interface Props {
  tables: number;
  onSeatSelected: (seat: Seat) => void;
  startingPositions: PairStartingPosition[];
}

export default function SelectPairsTable({
  tables,
  onSeatSelected,
  startingPositions,
}: Props) {
  const isTaken = (table: number, direction: PairDirection) => {
    return startingPositions.some(
      (a) => a.tableNumber === table && a.direction === direction,
    );
  };

  const isTableFull = (table: number) =>
    PairDirections.every((d) => isTaken(table, d));

  const tableNumbers = Array.from({ length: tables }, (_, i) => i + 1);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="w-full flex-shrink-0">{/* <SectionInfo /> */}</div>

      <div className="px-4 mt-4 mb-2">
        <span>Please select the table and direction you are sitting:</span>
      </div>

      {/* Scrollable Grid */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {tableNumbers.map((tableNumber) => (
            <div
              key={tableNumber}
              className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${
                isTableFull(tableNumber) ? "opacity-50" : ""
              }`}
            >
              <div className="text-center py-3 text-lg font-semibold text-gray-700 border-b border-gray-200 bg-blue-300">
                Table {tableNumber}
              </div>

              <div className="grid grid-cols-2">
                {PairDirections.map((direction) => {
                  const taken = isTaken(tableNumber, direction);

                  return (
                    <button
                      key={direction}
                      onClick={() =>
                        onSeatSelected({ type: "PAIR", tableNumber, direction })
                      }
                      disabled={taken}
                      className={`py-5 text-lg font-medium transition border-r last:border-r-0 border-gray-200
                        ${
                          taken
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                        }`}
                    >
                      {direction}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
